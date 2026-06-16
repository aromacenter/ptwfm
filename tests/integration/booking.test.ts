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

// A bookable instant three days from now at 10:00 London time.
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

async function makeClient(email: string) {
  const user = await prisma.user.create({
    data: { name: "Client", email, passwordHash: "x", role: "CLIENT" },
  });
  return user;
}

function bookReq(trainerId: string, iso: string) {
  return new Request("http://localhost/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trainerId, start: iso }),
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

  it("books an available slot and creates the client profile", async () => {
    const { trainerId, slot } = await seedTrainerWithAvailability();
    const client = await makeClient("c1@example.com");
    mockedGetUser.mockResolvedValue({
      id: client.id,
      email: client.email,
      name: client.name,
      role: "CLIENT",
      locale: "en",
    });

    const res = await bookingPOST(bookReq(trainerId, slot.iso));
    expect(res.status).toBe(201);

    const appts = await prisma.appointment.findMany({ where: { trainerId } });
    expect(appts).toHaveLength(1);
    expect(appts[0].status).toBe("BOOKED");

    const profile = await prisma.clientProfile.findUnique({
      where: { userId: client.id },
    });
    expect(profile?.trainerId).toBe(trainerId);
  });

  it("prevents double-booking the same slot", async () => {
    const { trainerId, slot } = await seedTrainerWithAvailability();
    const c1 = await makeClient("c2@example.com");
    const c2 = await makeClient("c3@example.com");

    mockedGetUser.mockResolvedValue({
      id: c1.id,
      email: c1.email,
      name: c1.name,
      role: "CLIENT",
      locale: "en",
    });
    const first = await bookingPOST(bookReq(trainerId, slot.iso));
    expect(first.status).toBe(201);

    mockedGetUser.mockResolvedValue({
      id: c2.id,
      email: c2.email,
      name: c2.name,
      role: "CLIENT",
      locale: "en",
    });
    const second = await bookingPOST(bookReq(trainerId, slot.iso));
    expect(second.status).toBe(409);

    const appts = await prisma.appointment.count({ where: { trainerId } });
    expect(appts).toBe(1);
  });

  it("rejects a slot outside the trainer's availability", async () => {
    const { trainerId } = await seedTrainerWithAvailability();
    const client = await makeClient("c4@example.com");
    mockedGetUser.mockResolvedValue({
      id: client.id,
      email: client.email,
      name: client.name,
      role: "CLIENT",
      locale: "en",
    });

    // 03:00 London on the same future day — not offered.
    const offHours = DateTime.now()
      .setZone("Europe/London")
      .plus({ days: 3 })
      .set({ hour: 3, minute: 0, second: 0, millisecond: 0 })
      .toUTC()
      .toISO()!;

    const res = await bookingPOST(bookReq(trainerId, offHours));
    expect(res.status).toBe(409);
  });

  it("rejects booking with a second trainer (1 client ↔ 1 trainer)", async () => {
    const a = await seedTrainerWithAvailability();
    const b = await seedTrainerWithAvailability();
    const client = await makeClient("c5@example.com");
    mockedGetUser.mockResolvedValue({
      id: client.id,
      email: client.email,
      name: client.name,
      role: "CLIENT",
      locale: "en",
    });

    const first = await bookingPOST(bookReq(a.trainerId, a.slot.iso));
    expect(first.status).toBe(201);

    const second = await bookingPOST(bookReq(b.trainerId, b.slot.iso));
    expect(second.status).toBe(409);
  });
});
