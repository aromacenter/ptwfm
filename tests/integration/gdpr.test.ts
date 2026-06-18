import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { runDbTests, resetDb } from "./helpers/db";

// Mock the auth session so we can drive GDPR routes as a specific user.
vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

import { prisma } from "@/lib/db";
import * as session from "@/lib/auth/session";
import { POST as registerPOST } from "@/app/api/auth/register/route";
import { POST as consentPOST } from "@/app/api/gdpr/consent/route";
import { POST as exportPOST } from "@/app/api/gdpr/export/route";
import { POST as erasurePOST } from "@/app/api/gdpr/erasure/route";

const mockedGetUser = vi.mocked(session.getCurrentUser);

function jsonReq(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe.runIf(runDbTests)("GDPR flows (DB)", () => {
  beforeEach(async () => {
    await resetDb();
    mockedGetUser.mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("registers a trainer with a TrainerProfile and terms consent", async () => {
    const res = await registerPOST(
      jsonReq("http://localhost/api/auth/register", {
        name: "Tom Trainer",
        email: "tom@example.com",
        password: "longpassword1",
        role: "TRAINER",
        termsConsent: true,
        healthConsent: false,
      }),
    );
    expect(res.status).toBe(201);

    const user = await prisma.user.findUnique({
      where: { email: "tom@example.com" },
      include: { trainerProfile: true, consents: true },
    });
    expect(user?.trainerProfile).not.toBeNull();
    expect(user?.consents.some((c) => c.type === "TERMS" && c.granted)).toBe(
      true,
    );
  });

  it("registers a client with explicit health-data consent", async () => {
    const res = await registerPOST(
      jsonReq("http://localhost/api/auth/register", {
        name: "Cara Client",
        email: "cara@example.com",
        password: "longpassword1",
        role: "CLIENT",
        termsConsent: true,
        healthConsent: true,
      }),
    );
    expect(res.status).toBe(201);

    const user = await prisma.user.findUnique({
      where: { email: "cara@example.com" },
      include: { consents: true },
    });
    expect(
      user?.consents.some((c) => c.type === "HEALTH_DATA" && c.granted),
    ).toBe(true);
  });

  it("rejects duplicate email registration", async () => {
    const body = {
      name: "Dup",
      email: "dup@example.com",
      password: "longpassword1",
      role: "TRAINER",
      termsConsent: true,
      healthConsent: false,
    };
    await registerPOST(jsonReq("http://localhost/api/auth/register", body));
    const res = await registerPOST(
      jsonReq("http://localhost/api/auth/register", body),
    );
    expect(res.status).toBe(409);
  });

  it("records consent grant then withdrawal with audit entries", async () => {
    const user = await prisma.user.create({
      data: {
        name: "Cara",
        email: "cara2@example.com",
        passwordHash: "x",
        role: "CLIENT",
      },
    });
    mockedGetUser.mockResolvedValue({
      id: user.id,
      email: user.email,
      name: user.name,
      role: "CLIENT",
      locale: "en",
    });

    await consentPOST(
      jsonReq("http://localhost/api/gdpr/consent", {
        type: "MARKETING",
        granted: true,
      }),
    );
    await consentPOST(
      jsonReq("http://localhost/api/gdpr/consent", {
        type: "MARKETING",
        granted: false,
      }),
    );

    const consents = await prisma.consent.findMany({
      where: { userId: user.id, type: "MARKETING" },
      orderBy: { createdAt: "asc" },
    });
    expect(consents).toHaveLength(2);
    expect(consents[0].granted).toBe(true);
    expect(consents[1].granted).toBe(false);
    expect(consents[1].withdrawnAt).not.toBeNull();

    const audits = await prisma.auditLog.count({
      where: { actorId: user.id, entity: "Consent" },
    });
    expect(audits).toBe(2);
  });

  it("exports the user's data as JSON without credentials", async () => {
    const user = await prisma.user.create({
      data: {
        name: "Export Me",
        email: "export@example.com",
        passwordHash: "secret-hash",
        role: "CLIENT",
      },
    });
    mockedGetUser.mockResolvedValue({
      id: user.id,
      email: user.email,
      name: user.name,
      role: "CLIENT",
      locale: "en",
    });

    const res = await exportPOST();
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("export@example.com");
    expect(text).not.toContain("secret-hash");

    const audit = await prisma.auditLog.findFirst({
      where: { actorId: user.id, action: "DATA_EXPORT" },
    });
    expect(audit).not.toBeNull();
  });

  it("erasure anonymises the user, deletes health notes, keeps payments", async () => {
    const trainer = await prisma.user.create({
      data: {
        name: "T",
        email: "t-erase@example.com",
        passwordHash: "x",
        role: "TRAINER",
        trainerProfile: { create: {} },
      },
      include: { trainerProfile: true },
    });
    const client = await prisma.user.create({
      data: {
        name: "Erase Me",
        email: "erase@example.com",
        passwordHash: "real-hash",
        role: "CLIENT",
        clientProfile: { create: { trainerId: trainer.trainerProfile!.id } },
      },
      include: { clientProfile: true },
    });
    const clientProfileId = client.clientProfile!.id;
    await prisma.healthNote.create({
      data: { clientId: clientProfileId, content: "knee injury" },
    });
    await prisma.payment.create({
      data: {
        clientId: clientProfileId,
        amountPence: 4500,
        type: "SESSION",
        status: "SUCCEEDED",
      },
    });

    mockedGetUser.mockResolvedValue({
      id: client.id,
      email: client.email,
      name: client.name,
      role: "CLIENT",
      locale: "en",
    });

    const res = await erasurePOST();
    expect(res.status).toBe(200);

    const erased = await prisma.user.findUnique({ where: { id: client.id } });
    expect(erased?.email).toBe(`erased-${client.id}@deleted.invalid`);
    expect(erased?.name).toBe("Erased user");
    expect(erased?.passwordHash).toBe("");

    const notes = await prisma.healthNote.count({
      where: { clientId: clientProfileId },
    });
    expect(notes).toBe(0);

    const payments = await prisma.payment.count({
      where: { clientId: clientProfileId },
    });
    expect(payments).toBe(1); // retained for legal reasons

    const dataRequest = await prisma.dataRequest.findFirst({
      where: { userId: client.id, type: "ERASURE" },
    });
    expect(dataRequest?.status).toBe("COMPLETED");
  });
});
