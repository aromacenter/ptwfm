import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { runDbTests, resetDb } from "./helpers/db";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

import { prisma } from "@/lib/db";
import * as session from "@/lib/auth/session";
import {
  GET as notesGET,
  POST as notesPOST,
} from "@/app/api/clients/[clientId]/notes/route";
import { POST as plansPOST } from "@/app/api/clients/[clientId]/plans/route";

const mockedGetUser = vi.mocked(session.getCurrentUser);

function asTrainer(id: string, email = "t@example.com") {
  mockedGetUser.mockResolvedValue({
    id,
    email,
    name: "Trainer",
    role: "TRAINER",
    locale: "en",
  });
}

async function seedTrainerAndClient(opts: { healthConsent: boolean; suffix: string }) {
  const trainer = await prisma.user.create({
    data: {
      name: "Trainer",
      email: `t-${opts.suffix}@example.com`,
      passwordHash: "x",
      role: "TRAINER",
      trainerProfile: { create: { hourlyRatePence: 4500 } },
    },
    include: { trainerProfile: true },
  });
  const client = await prisma.user.create({
    data: {
      name: "Client",
      email: `c-${opts.suffix}@example.com`,
      passwordHash: "x",
      role: "CLIENT",
      clientProfile: { create: { trainerId: trainer.trainerProfile!.id } },
      consents: opts.healthConsent
        ? {
            create: {
              type: "HEALTH_DATA",
              version: "1.0",
              granted: true,
              grantedAt: new Date(),
            },
          }
        : undefined,
    },
    include: { clientProfile: true },
  });
  return {
    trainerUserId: trainer.id,
    clientId: client.clientProfile!.id,
  };
}

const ctx = (clientId: string) => ({ params: Promise.resolve({ clientId }) });
const req = (body?: unknown) =>
  new Request("http://localhost/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

describe.runIf(runDbTests)("client area (DB)", () => {
  beforeEach(async () => {
    await resetDb();
    mockedGetUser.mockReset();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("blocks health notes when the client has not consented", async () => {
    const { trainerUserId, clientId } = await seedTrainerAndClient({
      healthConsent: false,
      suffix: "noconsent",
    });
    asTrainer(trainerUserId);
    const res = await notesGET(new Request("http://localhost/x"), ctx(clientId));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("consent_missing");
  });

  it("allows viewing notes with consent and writes an audit entry", async () => {
    const { trainerUserId, clientId } = await seedTrainerAndClient({
      healthConsent: true,
      suffix: "view",
    });
    asTrainer(trainerUserId);
    const res = await notesGET(new Request("http://localhost/x"), ctx(clientId));
    expect(res.status).toBe(200);

    const audit = await prisma.auditLog.findFirst({
      where: { action: "HEALTH_NOTE_VIEW", actorId: trainerUserId },
    });
    expect(audit).not.toBeNull();
  });

  it("creates a health note (with consent) and audits it", async () => {
    const { trainerUserId, clientId } = await seedTrainerAndClient({
      healthConsent: true,
      suffix: "create",
    });
    asTrainer(trainerUserId);
    const res = await notesPOST(req({ content: "Recovering from knee injury" }), ctx(clientId));
    expect(res.status).toBe(201);

    const notes = await prisma.healthNote.findMany({ where: { clientId } });
    expect(notes).toHaveLength(1);
    const audit = await prisma.auditLog.findFirst({
      where: { action: "HEALTH_NOTE_CREATE", actorId: trainerUserId },
    });
    expect(audit).not.toBeNull();
  });

  it("does not let a trainer access another trainer's client", async () => {
    const { clientId } = await seedTrainerAndClient({
      healthConsent: true,
      suffix: "owned",
    });
    // A different trainer.
    const other = await prisma.user.create({
      data: {
        name: "Other",
        email: "other@example.com",
        passwordHash: "x",
        role: "TRAINER",
        trainerProfile: { create: {} },
      },
    });
    asTrainer(other.id, "other@example.com");
    const res = await notesGET(new Request("http://localhost/x"), ctx(clientId));
    expect(res.status).toBe(404);
  });

  it("creates a training plan with items", async () => {
    const { trainerUserId, clientId } = await seedTrainerAndClient({
      healthConsent: true,
      suffix: "plan",
    });
    asTrainer(trainerUserId);
    const res = await plansPOST(
      req({
        scope: "WEEK",
        title: "Week 1",
        startDate: "2026-06-16T00:00:00.000Z",
        endDate: "2026-06-23T00:00:00.000Z",
        items: ["Squat 3x5", "Run 5k"],
      }),
      ctx(clientId),
    );
    expect(res.status).toBe(201);

    const plan = await prisma.trainingPlan.findFirst({
      where: { clientId },
      include: { items: true },
    });
    expect(plan?.title).toBe("Week 1");
    expect(plan?.items).toHaveLength(2);
  });
});
