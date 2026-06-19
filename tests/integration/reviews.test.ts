import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { runDbTests, resetDb } from "./helpers/db";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

import { prisma } from "@/lib/db";
import * as session from "@/lib/auth/session";
import { POST as reviewPOST } from "@/app/api/trainers/[trainerId]/reviews/route";

const mockedGetUser = vi.mocked(session.getCurrentUser);
const HOUR = 60 * 60 * 1000;

let seq = 0;
async function makeTrainer() {
  seq += 1;
  const u = await prisma.user.create({
    data: {
      name: "Trainer",
      email: `rv-tr-${seq}-${Date.now()}@example.com`,
      passwordHash: "x",
      role: "TRAINER",
      trainerProfile: { create: {} },
    },
    include: { trainerProfile: true },
  });
  return u.trainerProfile!.id;
}

async function makeClient(email: string, dedicateTo?: string) {
  const u = await prisma.user.create({
    data: {
      name: "Client",
      email,
      passwordHash: "x",
      role: "CLIENT",
      clientProfile: dedicateTo
        ? { create: { trainerId: dedicateTo } }
        : { create: {} },
    },
    include: { clientProfile: true },
  });
  return { userId: u.id, clientId: u.clientProfile!.id };
}

async function addAppointment(trainerId: string, clientId: string) {
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

function asClient(userId: string) {
  mockedGetUser.mockResolvedValue({
    id: userId,
    email: "c@example.com",
    name: "Client",
    role: "CLIENT",
    locale: "en",
  });
}

const ctx = (trainerId: string) => ({
  params: Promise.resolve({ trainerId }),
});
const req = (body: unknown) =>
  new Request("http://localhost/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe.runIf(runDbTests)("trainer reviews (DB)", () => {
  beforeEach(async () => {
    await resetDb();
    mockedGetUser.mockReset();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lets a dedicated client leave a review", async () => {
    const trainerId = await makeTrainer();
    const { userId, clientId } = await makeClient("rv1@example.com", trainerId);
    asClient(userId);

    const res = await reviewPOST(req({ rating: 5, comment: "Great" }), ctx(trainerId));
    expect(res.status).toBe(200);

    const review = await prisma.review.findUnique({
      where: { trainerId_clientId: { trainerId, clientId } },
    });
    expect(review?.rating).toBe(5);
    expect(review?.comment).toBe("Great");
  });

  it("lets a client who booked (but isn't dedicated) review", async () => {
    const trainerId = await makeTrainer();
    const { userId, clientId } = await makeClient("rv2@example.com");
    await addAppointment(trainerId, clientId);
    asClient(userId);

    const res = await reviewPOST(req({ rating: 4, comment: "" }), ctx(trainerId));
    expect(res.status).toBe(200);
    expect(
      (await prisma.review.findUnique({
        where: { trainerId_clientId: { trainerId, clientId } },
      }))?.rating,
    ).toBe(4);
  });

  it("rejects a client with no relationship to the trainer", async () => {
    const trainerId = await makeTrainer();
    const { userId } = await makeClient("rv3@example.com");
    asClient(userId);

    const res = await reviewPOST(req({ rating: 5 }), ctx(trainerId));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("not_eligible");
  });

  it("upserts: a second submission updates the existing review", async () => {
    const trainerId = await makeTrainer();
    const { userId, clientId } = await makeClient("rv4@example.com", trainerId);
    asClient(userId);

    await reviewPOST(req({ rating: 3, comment: "ok" }), ctx(trainerId));
    const res = await reviewPOST(req({ rating: 5, comment: "better" }), ctx(trainerId));
    expect(res.status).toBe(200);

    const all = await prisma.review.findMany({ where: { trainerId, clientId } });
    expect(all).toHaveLength(1);
    expect(all[0].rating).toBe(5);
    expect(all[0].comment).toBe("better");
  });

  it("rejects an invalid rating", async () => {
    const trainerId = await makeTrainer();
    const { userId } = await makeClient("rv5@example.com", trainerId);
    asClient(userId);

    const res = await reviewPOST(req({ rating: 9 }), ctx(trainerId));
    expect(res.status).toBe(400);
  });
});
