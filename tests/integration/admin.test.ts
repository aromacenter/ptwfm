import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { runDbTests, resetDb } from "./helpers/db";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

import { prisma } from "@/lib/db";
import * as session from "@/lib/auth/session";
import {
  GET as integrationsGET,
  POST as integrationsPOST,
} from "@/app/api/admin/integrations/route";
import { getSetting, resolveIntegration } from "@/lib/settings";

const mockedGetUser = vi.mocked(session.getCurrentUser);

const adminUser = {
  id: "admin1",
  email: "admin@example.com",
  name: "Admin",
  role: "ADMIN" as const,
  locale: "en",
};

function postReq(key: string, value: string) {
  return new Request("http://localhost/api/admin/integrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
}

describe.runIf(runDbTests)("admin integrations (DB)", () => {
  beforeEach(async () => {
    await resetDb();
    mockedGetUser.mockReset();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("forbids non-admins", async () => {
    mockedGetUser.mockResolvedValue({ ...adminUser, role: "CLIENT" });
    expect((await integrationsGET()).status).toBe(403);
  });

  it("lists integration statuses for an admin", async () => {
    mockedGetUser.mockResolvedValue(adminUser);
    const res = await integrationsGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    const keys = body.integrations.map((i: { key: string }) => i.key);
    expect(keys).toContain("STRIPE_SECRET_KEY");
    expect(keys).toContain("GEMINI_API_KEY");
  });

  it("stores a secret encrypted (not as plaintext) and resolves it", async () => {
    mockedGetUser.mockResolvedValue(adminUser);
    const res = await integrationsPOST(postReq("GEMINI_API_KEY", "secret-key-xyz"));
    expect(res.status).toBe(200);

    const row = await prisma.setting.findUnique({
      where: { key: "GEMINI_API_KEY" },
    });
    expect(row?.encrypted).toBe(true);
    expect(row?.value).not.toContain("secret-key-xyz");
    expect(await getSetting("GEMINI_API_KEY")).toBe("secret-key-xyz");
    expect(await resolveIntegration("GEMINI_API_KEY")).toBe("secret-key-xyz");
  });

  it("stores a non-secret value in plaintext", async () => {
    mockedGetUser.mockResolvedValue(adminUser);
    await integrationsPOST(postReq("GEMINI_MODEL", "gemini-2.0-pro"));
    const row = await prisma.setting.findUnique({
      where: { key: "GEMINI_MODEL" },
    });
    expect(row?.encrypted).toBe(false);
    expect(row?.value).toBe("gemini-2.0-pro");
  });

  it("clears a setting when given an empty value", async () => {
    mockedGetUser.mockResolvedValue(adminUser);
    await integrationsPOST(postReq("GEMINI_MODEL", "gemini-2.0-pro"));
    await integrationsPOST(postReq("GEMINI_MODEL", ""));
    expect(
      await prisma.setting.findUnique({ where: { key: "GEMINI_MODEL" } }),
    ).toBeNull();
  });

  it("rejects an unknown key", async () => {
    mockedGetUser.mockResolvedValue(adminUser);
    expect((await integrationsPOST(postReq("EVIL_KEY", "x"))).status).toBe(400);
  });
});
