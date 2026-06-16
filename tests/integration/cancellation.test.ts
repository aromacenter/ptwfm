import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { runDbTests, resetDb } from "./helpers/db";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

import { prisma } from "@/lib/db";
import * as session from "@/lib/auth/session";
import { POST as cancelPOST } from "@/app/api/bookings/cancel/route";

const mockedGetUser = vi.mocked(session.getCurrentUser);

const HOUR = 60 * 60 * 1000;

async function seed(opts: {
  email: string;
  startInHours: number;
  withCredit: boolean;
  rate?: number;
}) {
  const trainer = await prisma.user.create({
    data: {
      name: "Trainer",
      email: `tr-${opts.email}`,
      passwordHash: "x",
      role: "TRAINER",
      trainerProfile: { create: { hourlyRatePence: opts.rate ?? 4500 } },
    },
    include: { trainerProfile: true },
  });
  const trainerId = trainer.trainerProfile!.id;

  const client = await prisma.user.create({
    data: {
      name: "Client",
      email: opts.email,
      passwordHash: "x",
      role: "CLIENT",
      clientProfile: { create: { trainerId } },
    },
    include: { clientProfile: true },
  });
  const clientId = client.clientProfile!.id;

  let creditId: string | null = null;
  let packId: string | null = null;
  if (opts.withCredit) {
    const pack = await prisma.creditPack.create({
      data: { clientId, name: "1", totalSessions: 1, remaining: 0 },
    });
    packId = pack.id;
    const credit = await prisma.sessionCredit.create({
      data: { packId: pack.id, usedAt: new Date() },
    });
    creditId = credit.id;
  }

  const startAt = new Date(Date.now() + opts.startInHours * HOUR);
  const appt = await prisma.appointment.create({
    data: {
      trainerId,
      clientId,
      startAt,
      endAt: new Date(startAt.getTime() + HOUR),
      status: "BOOKED",
      creditId,
    },
  });

  mockedGetUser.mockResolvedValue({
    id: client.id,
    email: opts.email,
    name: "Client",
    role: "CLIENT",
    locale: "en",
  });

  return { apptId: appt.id, clientId, creditId, packId };
}

function cancelReq(appointmentId: string) {
  return new Request("http://localhost/api/bookings/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appointmentId }),
  });
}

describe.runIf(runDbTests)("cancellation (DB)", () => {
  beforeEach(async () => {
    await resetDb();
    mockedGetUser.mockReset();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("free cancellation (>24h) restores the credit", async () => {
    const { apptId, creditId, packId } = await seed({
      email: "free@example.com",
      startInHours: 48,
      withCredit: true,
    });

    const res = await cancelPOST(cancelReq(apptId));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ outcome: "FREE" });

    const appt = await prisma.appointment.findUnique({ where: { id: apptId } });
    expect(appt?.status).toBe("CANCELLED_FREE");

    const credit = await prisma.sessionCredit.findUnique({
      where: { id: creditId! },
    });
    expect(credit?.usedAt).toBeNull();

    const pack = await prisma.creditPack.findUnique({ where: { id: packId! } });
    expect(pack?.remaining).toBe(1);
  });

  it("late cancellation (<24h) with a credit forfeits it", async () => {
    const { apptId, creditId, packId } = await seed({
      email: "late@example.com",
      startInHours: 2,
      withCredit: true,
    });

    const res = await cancelPOST(cancelReq(apptId));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ outcome: "LATE" });

    const appt = await prisma.appointment.findUnique({ where: { id: apptId } });
    expect(appt?.status).toBe("CANCELLED_LATE");

    const credit = await prisma.sessionCredit.findUnique({
      where: { id: creditId! },
    });
    expect(credit?.usedAt).not.toBeNull(); // forfeited

    const pack = await prisma.creditPack.findUnique({ where: { id: packId! } });
    expect(pack?.remaining).toBe(0);
  });

  it("late cancellation without a credit raises a pending late fee", async () => {
    const { apptId, clientId } = await seed({
      email: "latefee@example.com",
      startInHours: 2,
      withCredit: false,
      rate: 5000,
    });

    const res = await cancelPOST(cancelReq(apptId));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ outcome: "LATE" });

    const fee = await prisma.payment.findFirst({
      where: { clientId, type: "LATE_CANCEL_FEE" },
    });
    expect(fee?.status).toBe("PENDING");
    expect(fee?.amountPence).toBe(5000);
  });

  it("rejects cancelling an appointment that is not the caller's", async () => {
    const { apptId } = await seed({
      email: "owner@example.com",
      startInHours: 48,
      withCredit: false,
    });
    // Switch to a different user.
    mockedGetUser.mockResolvedValue({
      id: "someone-else",
      email: "intruder@example.com",
      name: "X",
      role: "CLIENT",
      locale: "en",
    });
    const res = await cancelPOST(cancelReq(apptId));
    expect(res.status).toBe(404);
  });
});
