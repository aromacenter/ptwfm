import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { runDbTests, resetDb } from "./helpers/db";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

import { prisma } from "@/lib/db";
import * as session from "@/lib/auth/session";
import { POST as profilePOST } from "@/app/api/trainer/profile/route";

const mockedGetUser = vi.mocked(session.getCurrentUser);

async function makeTrainer() {
  const u = await prisma.user.create({
    data: {
      name: "Trainer",
      email: `tp-${Date.now()}-${Math.random()}@example.com`,
      passwordHash: "x",
      role: "TRAINER",
      trainerProfile: { create: {} },
    },
    include: { trainerProfile: true },
  });
  mockedGetUser.mockResolvedValue({
    id: u.id,
    email: u.email,
    name: "Trainer",
    role: "TRAINER",
    locale: "en",
  });
  return u.trainerProfile!.id;
}

function req(body: unknown) {
  return new Request("http://localhost/api/trainer/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe.runIf(runDbTests)("trainer profile (DB)", () => {
  beforeEach(async () => {
    await resetDb();
    mockedGetUser.mockReset();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("updates the public profile and rate", async () => {
    const trainerId = await makeTrainer();
    const res = await profilePOST(
      req({
        name: "Renamed Coach",
        headline: "Strength coach",
        bio: "10 years experience.",
        acceptingClients: true,
        hourlyRatePence: 5500,
      }),
    );
    expect(res.status).toBe(200);

    const profile = await prisma.trainerProfile.findUnique({
      where: { id: trainerId },
      include: { user: { select: { name: true } } },
    });
    expect(profile?.headline).toBe("Strength coach");
    expect(profile?.hourlyRatePence).toBe(5500);
    expect(profile?.acceptingClients).toBe(true);
    expect(profile?.user.name).toBe("Renamed Coach");
  });

  it("stores empty headline/bio as null", async () => {
    const trainerId = await makeTrainer();
    await profilePOST(
      req({ name: "Sam", headline: "", bio: "", acceptingClients: false, hourlyRatePence: 0 }),
    );
    const profile = await prisma.trainerProfile.findUnique({
      where: { id: trainerId },
    });
    expect(profile?.headline).toBeNull();
    expect(profile?.bio).toBeNull();
    expect(profile?.acceptingClients).toBe(false);
  });

  it("forbids non-trainers", async () => {
    mockedGetUser.mockResolvedValue({
      id: "x",
      email: "c@example.com",
      name: "C",
      role: "CLIENT",
      locale: "en",
    });
    const res = await profilePOST(
      req({ name: "X", headline: "", bio: "", acceptingClients: true, hourlyRatePence: 0 }),
    );
    expect(res.status).toBe(403);
  });
});
