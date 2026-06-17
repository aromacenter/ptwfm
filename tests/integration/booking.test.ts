import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { DateTime } from "luxon";
import { runDbTests, resetDb } from "./helpers/db";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

import { prisma } from "@/lib/db";
import * as session from "@/lib/auth/session";
import { POST as bookingPOST } from "@/app/api/bookings/route";

const mockedGetUser = vi.mocked(session.getCurrentUser);

function futureSlot() {
  const target = DateTime.now()
    .setZone("Europe/London")
    .plus({ days: 3 })
    .set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
  return {
    dayOfWeek: target.weekday % 7,
    startHour: 10,
    iso: target.toUTC().toISO()!,
  };
}

let seq = 0;
async function seedTrainerWithAvailability() {
  const slot = futureSlot();
  seq += 1;
  const trainer = await prisma.user.create({
    data: {
      name: "Trainer",
      email: `trainer-${seq}-${Date.now()}@example.com`,
      passwordHash: "x",
      role: "TRAINER",
      trainerProfile: {
        create: {
          availabilityRules: {
            create: {
              dayOfWeek: slot.dayOfWeek,
              startHour: slot.startHour,
              endHour: slot.startHour + 1,
            },
          },
        },
      },
    },
    include: { trainerProfile: true },
  });
  return { trainerId: trainer.trainerProfile!.id, slot };
}

async function makeClient(email: string, dedicateTo?: string) {
  const user = await prisma.user.create({
    data: {
      name: "Client",
      email,
      passwordHash: "x",
      role: "CLIENT",
      clientProfile: dedicateTo
        ? { create: { trainerId: dedicateTo } }
        : undefined,
    },
  });
  return user;
}

function asClient(user: { id: string; email: string }) {
  mockedGetUser.mockResolvedValue({
    id: user.id,
    email: user.email,
    name: "Client",
    role: "CLIENT",
    locale: "en",
  });
}

function bookReq(trainerId: string, iso: string, kind?: "SESSION" | "CONSULTATION") {
  return new Request("http://localhost/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trainerId, start: iso, ...(kind ? { kind } : {}) }),
  });
}

describe.runIf(runDbTests)("booking flow (DB)", () => {
  beforeEach(async () => {
    await resetDb();
    mockedGetUser.mockReset();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("consultation booking creates an unbound client profile", async () => {
    const { trainerId, slot } = await seedTrainerWithAvailability();
    const client = await makeClient("c1@example.com");
    asClient(client);

    const res = await bookingPOST(bookReq(trainerId, slot.iso, "CONSULTATION"));
    expect(res.status).toBe(201);

    const profile = await prisma.clientProfile.findUnique({
      where: { userId: client.id },
    });
    expect(profile).not.toBeNull();
    expect(profile?.trainerId).toBeNull(); // not dedicated yet

    const appt = await prisma.appointment.findFirst({ where: { trainerId } });
    expect(appt?.kind).toBe("CONSULTATION");
  });

  it("rejects a session booking when not dedicated", async () => {
    const { trainerId, slot } = await seedTrainerWithAvailability();
    const client = await makeClient("c2@example.com");
    asClient(client);

    const res = await bookingPOST(bookReq(trainerId, slot.iso, "SESSION"));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("not_dedicated");
  });

  it("allows a session booking for a dedicated client and consumes a credit", async () => {
    const { trainerId, slot } = await seedTrainerWithAvailability();
    const client = await makeClient("c3@example.com", trainerId);
    const profile = await prisma.clientProfile.findUnique({
      where: { userId: client.id },
    });
    const pack = await prisma.creditPack.create({
      data: { clientId: profile!.id, name: "1", totalSessions: 1, remaining: 1 },
    });
    await prisma.sessionCredit.create({ data: { packId: pack.id } });
    asClient(client);

    const res = await bookingPOST(bookReq(trainerId, slot.iso, "SESSION"));
    expect(res.status).toBe(201);

    const appt = await prisma.appointment.findFirst({ where: { trainerId } });
    expect(appt?.kind).toBe("SESSION");
    expect(appt?.creditId).not.toBeNull();
  });

  it("prevents double-booking the same slot", async () => {
    const { trainerId, slot } = await seedTrainerWithAvailability();
    const c1 = await makeClient("c4@example.com");
    const c2 = await makeClient("c5@example.com");

    asClient(c1);
    expect((await bookingPOST(bookReq(trainerId, slot.iso, "CONSULTATION"))).status).toBe(201);

    asClient(c2);
    expect((await bookingPOST(bookReq(trainerId, slot.iso, "CONSULTATION"))).status).toBe(409);

    expect(await prisma.appointment.count({ where: { trainerId } })).toBe(1);
  });

  it("rejects a slot outside the trainer's availability", async () => {
    const { trainerId } = await seedTrainerWithAvailability();
    const client = await makeClient("c6@example.com");
    asClient(client);
    const offHours = DateTime.now()
      .setZone("Europe/London")
      .plus({ days: 3 })
      .set({ hour: 3, minute: 0, second: 0, millisecond: 0 })
      .toUTC()
      .toISO()!;
    expect((await bookingPOST(bookReq(trainerId, offHours, "CONSULTATION"))).status).toBe(409);
  });

  it("rejects a consultation when already dedicated", async () => {
    const a = await seedTrainerWithAvailability();
    const b = await seedTrainerWithAvailability();
    const client = await makeClient("c7@example.com", a.trainerId); // dedicated to A
    asClient(client);

    const res = await bookingPOST(bookReq(b.trainerId, b.slot.iso, "CONSULTATION"));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("already_dedicated");
  });
});
