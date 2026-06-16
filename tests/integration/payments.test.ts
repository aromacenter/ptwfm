import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import type Stripe from "stripe";
import { DateTime } from "luxon";
import { runDbTests, resetDb } from "./helpers/db";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

import { prisma } from "@/lib/db";
import * as session from "@/lib/auth/session";
import { handleStripeEvent } from "@/lib/payments/handle-event";
import { POST as bookingPOST } from "@/app/api/bookings/route";

const mockedGetUser = vi.mocked(session.getCurrentUser);

function event(id: string, type: string, object: unknown): Stripe.Event {
  return { id, type, data: { object } } as unknown as Stripe.Event;
}

async function makeClientProfile(email: string, trainerId: string) {
  const user = await prisma.user.create({
    data: {
      name: "Client",
      email,
      passwordHash: "x",
      role: "CLIENT",
      clientProfile: { create: { trainerId } },
    },
    include: { clientProfile: true },
  });
  return { userId: user.id, clientId: user.clientProfile!.id };
}

async function makeTrainer() {
  const t = await prisma.user.create({
    data: {
      name: "Trainer",
      email: `tr-${Date.now()}-${Math.random()}@example.com`,
      passwordHash: "x",
      role: "TRAINER",
      trainerProfile: { create: { hourlyRatePence: 4500 } },
    },
    include: { trainerProfile: true },
  });
  return t.trainerProfile!.id;
}

describe.runIf(runDbTests)("payments (DB)", () => {
  beforeEach(async () => {
    await resetDb();
    mockedGetUser.mockReset();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("checkout.session.completed (package) creates a payment, pack and credits", async () => {
    const trainerId = await makeTrainer();
    const { clientId } = await makeClientProfile("p1@example.com", trainerId);

    await handleStripeEvent(
      event("evt_pkg_1", "checkout.session.completed", {
        metadata: { clientId, kind: "package", sessions: "5", packageName: "5 sessions" },
        amount_total: 21375,
        currency: "gbp",
        payment_intent: "pi_pkg_1",
      }),
    );

    const payments = await prisma.payment.findMany({ where: { clientId } });
    expect(payments).toHaveLength(1);
    expect(payments[0].type).toBe("PACKAGE");
    expect(payments[0].amountPence).toBe(21375);

    const pack = await prisma.creditPack.findFirst({ where: { clientId } });
    expect(pack?.remaining).toBe(5);

    const credits = await prisma.sessionCredit.count({
      where: { pack: { clientId } },
    });
    expect(credits).toBe(5);
  });

  it("is idempotent for a repeated event id", async () => {
    const trainerId = await makeTrainer();
    const { clientId } = await makeClientProfile("p2@example.com", trainerId);
    const evt = event("evt_dup", "checkout.session.completed", {
      metadata: { clientId, kind: "package", sessions: "5" },
      amount_total: 21375,
      currency: "gbp",
      payment_intent: "pi_dup",
    });
    await handleStripeEvent(evt);
    await handleStripeEvent(evt); // replay

    expect(await prisma.creditPack.count({ where: { clientId } })).toBe(1);
    expect(await prisma.sessionCredit.count({ where: { pack: { clientId } } })).toBe(5);
  });

  it("setup_intent.succeeded stores an active Bacs payment method", async () => {
    const trainerId = await makeTrainer();
    const { clientId } = await makeClientProfile("p3@example.com", trainerId);

    await handleStripeEvent(
      event("evt_si_1", "setup_intent.succeeded", {
        metadata: { clientId },
        payment_method: "pm_bacs_1",
        mandate: "mandate_1",
      }),
    );

    const pm = await prisma.paymentMethod.findUnique({
      where: { stripePaymentMethodId: "pm_bacs_1" },
    });
    expect(pm?.type).toBe("BACS_DEBIT");
    expect(pm?.status).toBe("ACTIVE");
    expect(pm?.mandateReference).toBe("mandate_1");
  });

  it("payment_intent.succeeded marks the matching payment succeeded", async () => {
    const trainerId = await makeTrainer();
    const { clientId } = await makeClientProfile("p4@example.com", trainerId);
    await prisma.payment.create({
      data: {
        clientId,
        amountPence: 4500,
        type: "SESSION",
        status: "PENDING",
        stripePaymentIntentId: "pi_x",
      },
    });

    await handleStripeEvent(
      event("evt_pi_1", "payment_intent.succeeded", { id: "pi_x" }),
    );

    const payment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: "pi_x" },
    });
    expect(payment?.status).toBe("SUCCEEDED");
  });

  it("booking consumes an available credit", async () => {
    const trainerId = await makeTrainer();
    const slot = DateTime.now()
      .setZone("Europe/London")
      .plus({ days: 3 })
      .set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
    await prisma.availabilityRule.create({
      data: { trainerId, dayOfWeek: slot.weekday % 7, startHour: 10, endHour: 11 },
    });
    const { userId, clientId } = await makeClientProfile("p5@example.com", trainerId);
    const pack = await prisma.creditPack.create({
      data: { clientId, name: "1 session", totalSessions: 1, remaining: 1 },
    });
    await prisma.sessionCredit.create({ data: { packId: pack.id } });

    mockedGetUser.mockResolvedValue({
      id: userId,
      email: "p5@example.com",
      name: "Client",
      role: "CLIENT",
      locale: "en",
    });

    const res = await bookingPOST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainerId, start: slot.toUTC().toISO() }),
      }),
    );
    expect(res.status).toBe(201);

    const appt = await prisma.appointment.findFirst({ where: { clientId } });
    expect(appt?.creditId).not.toBeNull();

    const usedCredits = await prisma.sessionCredit.count({
      where: { pack: { clientId }, usedAt: { not: null } },
    });
    expect(usedCredits).toBe(1);

    const updatedPack = await prisma.creditPack.findUnique({ where: { id: pack.id } });
    expect(updatedPack?.remaining).toBe(0);
  });
});
