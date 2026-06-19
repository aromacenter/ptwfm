import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { runDbTests, resetDb } from "./helpers/db";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

import { prisma } from "@/lib/db";
import * as session from "@/lib/auth/session";
import { POST as createPOST } from "@/app/api/trainer-requests/route";
import { POST as respondPOST } from "@/app/api/trainer-requests/[requestId]/respond/route";

const mockedGetUser = vi.mocked(session.getCurrentUser);

let seq = 0;
async function makeTrainer() {
  seq += 1;
  const u = await prisma.user.create({
    data: {
      name: "Trainer",
      email: `req-tr-${seq}-${Date.now()}@example.com`,
      passwordHash: "x",
      role: "TRAINER",
      trainerProfile: { create: {} },
    },
    include: { trainerProfile: true },
  });
  return { userId: u.id, trainerId: u.trainerProfile!.id };
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

const validBody = {
  name: "Jane",
  email: "jane@example.com",
  goal: "Strength training twice a week",
  consent: true,
};
const jsonReq = (body: unknown) =>
  new Request("http://localhost/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const ctx = (requestId: string) => ({ params: Promise.resolve({ requestId }) });

describe.runIf(runDbTests)("trainer requests (DB)", () => {
  beforeEach(async () => {
    await resetDb();
    mockedGetUser.mockReset();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates an open request from the public form", async () => {
    const res = await createPOST(jsonReq(validBody));
    expect(res.status).toBe(200);
    const all = await prisma.trainerRequest.findMany();
    expect(all).toHaveLength(1);
    expect(all[0].open).toBe(true);
    expect(all[0].email).toBe("jane@example.com");
  });

  it("rejects a request without consent", async () => {
    const res = await createPOST(jsonReq({ ...validBody, consent: false }));
    expect(res.status).toBe(400);
    expect(await prisma.trainerRequest.count()).toBe(0);
  });

  it("lets a trainer mark a request responded (idempotent)", async () => {
    const { userId, trainerId } = await makeTrainer();
    const request = await prisma.trainerRequest.create({
      data: { name: "Jane", email: "jane@example.com", goal: "g" },
    });
    asTrainer(userId);

    const res1 = await respondPOST(jsonReq({}), ctx(request.id));
    expect(res1.status).toBe(200);
    const res2 = await respondPOST(jsonReq({}), ctx(request.id));
    expect(res2.status).toBe(200);

    const responses = await prisma.trainerRequestResponse.findMany({
      where: { requestId: request.id, trainerId },
    });
    expect(responses).toHaveLength(1);
  });

  it("forbids a non-trainer from responding", async () => {
    const request = await prisma.trainerRequest.create({
      data: { name: "Jane", email: "jane@example.com", goal: "g" },
    });
    mockedGetUser.mockResolvedValue({
      id: "u1",
      email: "c@example.com",
      name: "Client",
      role: "CLIENT",
      locale: "en",
    });
    const res = await respondPOST(jsonReq({}), ctx(request.id));
    expect(res.status).toBe(403);
  });
});
