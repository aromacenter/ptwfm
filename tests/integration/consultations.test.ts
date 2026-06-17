import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { runDbTests, resetDb } from "./helpers/db";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

import { prisma } from "@/lib/db";
import * as session from "@/lib/auth/session";
import { POST as dedicatePOST } from "@/app/api/clients/[clientId]/dedicate/route";
import { POST as releasePOST } from "@/app/api/clients/[clientId]/release/route";

const mockedGetUser = vi.mocked(session.getCurrentUser);
const HOUR = 60 * 60 * 1000;

let seq = 0;
async function makeTrainer() {
  seq += 1;
  const u = await prisma.user.create({
    data: {
      name: "Trainer",
      email: `tr-${seq}-${Date.now()}@example.com`,
      passwordHash: "x",
      role: "TRAINER",
      trainerProfile: { create: {} },
    },
    include: { trainerProfile: true },
  });
  return { userId: u.id, trainerId: u.trainerProfile!.id };
}

async function makeClient(email: string, dedicateTo?: string) {
  const u = await prisma.user.create({
    data: {
      name: "Client",
      email,
      passwordHash: "x",
      role: "CLIENT",
      clientProfile: dedicateTo ? { create: { trainerId: dedicateTo } } : { create: {} },
    },
    include: { clientProfile: true },
  });
  return u.clientProfile!.id;
}

async function addConsultation(trainerId: string, clientId: string) {
  const start = new Date(Date.now() + 24 * HOUR);
  return prisma.appointment.create({
    data: {
      trainerId,
      clientId,
      startAt: start,
      endAt: new Date(start.getTime() + HOUR),
      status: "BOOKED",
      kind: "CONSULTATION",
    },
  });
}

function asTrainer(userId: string) {
  mockedGetUser.mockResolvedValue({
    id: userId,
    email: "t@example.com",
    name: "Trainer",
    role: "TRAINER",
    locale: "en",
  });
}

const ctx = (clientId: string) => ({ params: Promise.resolve({ clientId }) });
const req = () => new Request("http://localhost/x", { method: "POST" });

describe.runIf(runDbTests)("consultation dedicate/release (DB)", () => {
  beforeEach(async () => {
    await resetDb();
    mockedGetUser.mockReset();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("dedicates a client after a consultation", async () => {
    const trainer = await makeTrainer();
    const clientId = await makeClient("d1@example.com");
    await addConsultation(trainer.trainerId, clientId);
    asTrainer(trainer.userId);

    const res = await dedicatePOST(req(), ctx(clientId));
    expect(res.status).toBe(200);

    const client = await prisma.clientProfile.findUnique({ where: { id: clientId } });
    expect(client?.trainerId).toBe(trainer.trainerId);
  });

  it("refuses to dedicate without a consultation", async () => {
    const trainer = await makeTrainer();
    const clientId = await makeClient("d2@example.com");
    asTrainer(trainer.userId);

    const res = await dedicatePOST(req(), ctx(clientId));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("no_consultation");
  });

  it("refuses to dedicate a client dedicated to another trainer", async () => {
    const a = await makeTrainer();
    const b = await makeTrainer();
    const clientId = await makeClient("d3@example.com", a.trainerId);
    await addConsultation(b.trainerId, clientId);
    asTrainer(b.userId);

    const res = await dedicatePOST(req(), ctx(clientId));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("already_dedicated");
  });

  it("release un-dedicates a client and cancels future appointments", async () => {
    const trainer = await makeTrainer();
    const clientId = await makeClient("d4@example.com", trainer.trainerId);
    const start = new Date(Date.now() + 48 * HOUR);
    const appt = await prisma.appointment.create({
      data: {
        trainerId: trainer.trainerId,
        clientId,
        startAt: start,
        endAt: new Date(start.getTime() + HOUR),
        status: "BOOKED",
        kind: "SESSION",
      },
    });
    asTrainer(trainer.userId);

    const res = await releasePOST(req(), ctx(clientId));
    expect(res.status).toBe(200);

    const client = await prisma.clientProfile.findUnique({ where: { id: clientId } });
    expect(client?.trainerId).toBeNull();
    const updated = await prisma.appointment.findUnique({ where: { id: appt.id } });
    expect(updated?.status).toBe("CANCELLED_FREE");
  });

  it("declining a consultation keeps the client free (not dedicated)", async () => {
    const trainer = await makeTrainer();
    const clientId = await makeClient("d5@example.com"); // not dedicated
    await addConsultation(trainer.trainerId, clientId);
    asTrainer(trainer.userId);

    const res = await releasePOST(req(), ctx(clientId));
    expect(res.status).toBe(200);

    const client = await prisma.clientProfile.findUnique({ where: { id: clientId } });
    expect(client?.trainerId).toBeNull();
  });
});
