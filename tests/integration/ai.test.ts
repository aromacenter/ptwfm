import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { DateTime } from "luxon";
import { runDbTests, resetDb } from "./helpers/db";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));
vi.mock("@/lib/gemini", () => ({
  generateText: vi.fn().mockResolvedValue("AI generated insight."),
}));

import { prisma } from "@/lib/db";
import * as session from "@/lib/auth/session";
import { resetRateLimits } from "@/lib/ratelimit";
import { POST as summaryPOST } from "@/app/api/ai/client-summary/route";
import { POST as schedulePOST } from "@/app/api/ai/schedule/route";

const mockedGetUser = vi.mocked(session.getCurrentUser);

function asTrainer(id: string) {
  mockedGetUser.mockResolvedValue({
    id,
    email: "t@example.com",
    name: "Trainer",
    role: "TRAINER",
    locale: "en",
  });
}

const jsonReq = (body: unknown) =>
  new Request("http://localhost/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe.runIf(runDbTests)("AI endpoints (DB, mocked Gemini)", () => {
  beforeEach(async () => {
    await resetDb();
    mockedGetUser.mockReset();
    resetRateLimits();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("client summary returns content and caches an AiInsight (with consent)", async () => {
    const trainer = await prisma.user.create({
      data: {
        name: "T",
        email: "t1@example.com",
        passwordHash: "x",
        role: "TRAINER",
        trainerProfile: { create: {} },
      },
      include: { trainerProfile: true },
    });
    const client = await prisma.user.create({
      data: {
        name: "C",
        email: "c1@example.com",
        passwordHash: "x",
        role: "CLIENT",
        clientProfile: { create: { trainerId: trainer.trainerProfile!.id } },
        consents: {
          create: {
            type: "HEALTH_DATA",
            version: "1.0",
            granted: true,
            grantedAt: new Date(),
          },
        },
      },
      include: { clientProfile: true },
    });
    const clientId = client.clientProfile!.id;
    await prisma.healthNote.create({
      data: { clientId, content: "Knee injury" },
    });

    asTrainer(trainer.id);
    const res = await summaryPOST(jsonReq({ clientId }));
    expect(res.status).toBe(200);
    expect((await res.json()).content).toContain("AI generated insight");

    const insight = await prisma.aiInsight.findFirst({
      where: { type: "CLIENT_SUMMARY", targetId: clientId },
    });
    expect(insight).not.toBeNull();
  });

  it("client summary is blocked without health consent", async () => {
    const trainer = await prisma.user.create({
      data: {
        name: "T",
        email: "t2@example.com",
        passwordHash: "x",
        role: "TRAINER",
        trainerProfile: { create: {} },
      },
      include: { trainerProfile: true },
    });
    const client = await prisma.user.create({
      data: {
        name: "C",
        email: "c2@example.com",
        passwordHash: "x",
        role: "CLIENT",
        clientProfile: { create: { trainerId: trainer.trainerProfile!.id } },
      },
      include: { clientProfile: true },
    });
    asTrainer(trainer.id);
    const res = await summaryPOST(jsonReq({ clientId: client.clientProfile!.id }));
    expect(res.status).toBe(403);
  });

  it("schedule optimisation returns content and caches an AiInsight", async () => {
    const slot = DateTime.now().setZone("Europe/London").plus({ days: 2 });
    const trainer = await prisma.user.create({
      data: {
        name: "T",
        email: "t3@example.com",
        passwordHash: "x",
        role: "TRAINER",
        trainerProfile: {
          create: {
            availabilityRules: {
              create: { dayOfWeek: slot.weekday % 7, startHour: 9, endHour: 12 },
            },
          },
        },
      },
      include: { trainerProfile: true },
    });

    asTrainer(trainer.id);
    const res = await schedulePOST();
    expect(res.status).toBe(200);

    const insight = await prisma.aiInsight.findFirst({
      where: { type: "SCHEDULE_OPT", targetId: trainer.trainerProfile!.id },
    });
    expect(insight).not.toBeNull();
  });
});
