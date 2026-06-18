import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { runDbTests, resetDb } from "./helpers/db";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

import { prisma } from "@/lib/db";
import * as session from "@/lib/auth/session";
import { POST as statusPOST } from "@/app/api/appointments/[id]/status/route";

const mockedGetUser = vi.mocked(session.getCurrentUser);
const HOUR = 60 * 60 * 1000;

let seq = 0;
async function seed(opts: { startInHours: number; rate?: number }) {
  seq += 1;
  const trainer = await prisma.user.create({
    data: {
      name: "Trainer",
      email: `as-tr-${seq}-${Date.now()}@example.com`,
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
      email: `as-cl-${seq}-${Date.now()}@example.com`,
      passwordHash: "x",
      role: "CLIENT",
      clientProfile: { create: { trainerId } },
    },
    include: { clientProfile: true },
  });
  const start = new Date(Date.now() + opts.startInHours * HOUR);
  const appt = await prisma.appointment.create({
    data: {
      trainerId,
      clientId: client.clientProfile!.id,
      startAt: start,
      endAt: new Date(start.getTime() + HOUR),
      status: "BOOKED",
      kind: "SESSION",
    },
  });
  mockedGetUser.mockResolvedValue({
    id: trainer.id,
    email: trainer.email,
    name: "Trainer",
    role: "TRAINER",
    locale: "en",
  });
  return { apptId: appt.id, clientId: client.clientProfile!.id, trainerUserId: trainer.id };
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (status: string) =>
  new Request("http://localhost/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

describe.runIf(runDbTests)("appointment status (DB)", () => {
  beforeEach(async () => {
    await resetDb();
    mockedGetUser.mockReset();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("marks a past session completed", async () => {
    const { apptId } = await seed({ startInHours: -2 });
    const res = await statusPOST(req("COMPLETED"), ctx(apptId));
    expect(res.status).toBe(200);
    const appt = await prisma.appointment.findUnique({ where: { id: apptId } });
    expect(appt?.status).toBe("COMPLETED");
  });

  it("no-show on an uncredited session raises a fee", async () => {
    const { apptId, clientId } = await seed({ startInHours: -1, rate: 5000 });
    const res = await statusPOST(req("NO_SHOW"), ctx(apptId));
    expect(res.status).toBe(200);
    const fee = await prisma.payment.findFirst({
      where: { clientId, type: "LATE_CANCEL_FEE" },
    });
    expect(fee?.status).toBe("PENDING");
    expect(fee?.amountPence).toBe(5000);
  });

  it("rejects marking a future session", async () => {
    const { apptId } = await seed({ startInHours: 2 });
    const res = await statusPOST(req("COMPLETED"), ctx(apptId));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("too_early");
  });
});
