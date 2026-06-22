import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { runDbTests, resetDb } from "./helpers/db";
import { prisma } from "@/lib/db";
import { POST as registerPOST } from "@/app/api/auth/register/route";

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const base = {
  name: "Goal Client",
  password: "longenough1",
  termsConsent: true,
  healthConsent: true,
  role: "CLIENT" as const,
};

describe.runIf(runDbTests)("registration goal (DB)", () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores a client's chosen goal", async () => {
    const res = await registerPOST(
      jsonReq({ ...base, email: "goal1@example.com", goal: "MUSCLE_GAIN" }),
    );
    expect(res.status).toBe(201);
    const user = await prisma.user.findUnique({
      where: { email: "goal1@example.com" },
    });
    expect(user?.goal).toBe("MUSCLE_GAIN");
  });

  it("leaves goal null when none is chosen", async () => {
    const res = await registerPOST(
      jsonReq({ ...base, email: "goal2@example.com" }),
    );
    expect(res.status).toBe(201);
    const user = await prisma.user.findUnique({
      where: { email: "goal2@example.com" },
    });
    expect(user?.goal).toBeNull();
  });

  it("ignores a goal sent for a trainer sign-up", async () => {
    const res = await registerPOST(
      jsonReq({
        ...base,
        role: "TRAINER",
        healthConsent: false,
        email: "goal3@example.com",
        goal: "STRENGTH",
      }),
    );
    expect(res.status).toBe(201);
    const user = await prisma.user.findUnique({
      where: { email: "goal3@example.com" },
    });
    expect(user?.goal).toBeNull();
  });
});
