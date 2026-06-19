import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { runDbTests, resetDb } from "./helpers/db";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

import { prisma } from "@/lib/db";
import * as session from "@/lib/auth/session";
import {
  GET as workoutsGET,
  POST as workoutsPOST,
} from "@/app/api/clients/[clientId]/workouts/route";
import { POST as nutritionPOST } from "@/app/api/clients/[clientId]/nutrition/route";

const mockedGetUser = vi.mocked(session.getCurrentUser);

let seq = 0;
async function seedTrainerClient() {
  seq += 1;
  const trainer = await prisma.user.create({
    data: {
      name: "T",
      email: `pl-tr-${seq}-${Date.now()}@example.com`,
      passwordHash: "x",
      role: "TRAINER",
      trainerProfile: { create: {} },
    },
    include: { trainerProfile: true },
  });
  const client = await prisma.user.create({
    data: {
      name: "C",
      email: `pl-cl-${seq}-${Date.now()}@example.com`,
      passwordHash: "x",
      role: "CLIENT",
      clientProfile: { create: { trainerId: trainer.trainerProfile!.id } },
    },
    include: { clientProfile: true },
  });
  return { trainerUserId: trainer.id, clientId: client.clientProfile!.id };
}

function asTrainer(id: string) {
  mockedGetUser.mockResolvedValue({
    id,
    email: "t@example.com",
    name: "T",
    role: "TRAINER",
    locale: "en",
  });
}

const ctx = (clientId: string) => ({ params: Promise.resolve({ clientId }) });
const jsonReq = (body: unknown) =>
  new Request("http://localhost/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe.runIf(runDbTests)("plans (DB)", () => {
  beforeEach(async () => {
    await resetDb();
    mockedGetUser.mockReset();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates and lists a workout program for an owned client", async () => {
    const { trainerUserId, clientId } = await seedTrainerClient();
    asTrainer(trainerUserId);

    const res = await workoutsPOST(
      jsonReq({
        title: "Strength block",
        days: [
          {
            label: "Day 1",
            exercises: [{ name: "Squat", sets: "3", reps: "5" }],
          },
        ],
      }),
      ctx(clientId),
    );
    expect(res.status).toBe(201);

    const list = await workoutsGET(new Request("http://localhost/x"), ctx(clientId));
    const body = await list.json();
    expect(body.programs).toHaveLength(1);
    expect(body.programs[0].title).toBe("Strength block");
  });

  it("creates a nutrition plan with meals", async () => {
    const { trainerUserId, clientId } = await seedTrainerClient();
    asTrainer(trainerUserId);

    const res = await nutritionPOST(
      jsonReq({
        title: "Cut plan",
        meals: [
          {
            name: "Breakfast",
            items: [{ food: "Oats", qty: "80g", kcal: 300, protein: 10 }],
          },
        ],
      }),
      ctx(clientId),
    );
    expect(res.status).toBe(201);

    const plan = await prisma.nutritionPlan.findFirst({ where: { clientId } });
    expect(plan?.title).toBe("Cut plan");
  });

  it("rejects building plans for a client of another trainer", async () => {
    const { clientId } = await seedTrainerClient();
    const other = await prisma.user.create({
      data: {
        name: "Other",
        email: `other-${Date.now()}@example.com`,
        passwordHash: "x",
        role: "TRAINER",
        trainerProfile: { create: {} },
      },
    });
    asTrainer(other.id);

    const res = await workoutsPOST(
      jsonReq({ title: "x", days: [{ label: "D", exercises: [] }] }),
      ctx(clientId),
    );
    expect(res.status).toBe(404);
  });

  it("rejects an invalid workout (no days)", async () => {
    const { trainerUserId, clientId } = await seedTrainerClient();
    asTrainer(trainerUserId);
    const res = await workoutsPOST(jsonReq({ title: "x", days: [] }), ctx(clientId));
    expect(res.status).toBe(400);
  });
});
