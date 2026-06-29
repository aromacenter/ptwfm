import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { runDbTests, resetDb } from "./helpers/db";
import { prisma } from "@/lib/db";
import { GET as exercisesGET } from "@/app/api/exercises/route";

async function seed() {
  await prisma.exercise.createMany({
    data: [
      {
        slug: "barbell-bench-press",
        name: "Barbell Bench Press",
        category: "PUSH",
        equipment: "BARBELL",
        primaryMuscles: ["CHEST"],
        secondaryMuscles: ["TRICEPS"],
        cues: ["Set the shoulder blades."],
      },
      {
        slug: "back-squat",
        name: "Barbell Back Squat",
        category: "LEGS",
        equipment: "BARBELL",
        primaryMuscles: ["QUADS"],
        secondaryMuscles: ["GLUTES"],
        cues: ["Brace and sit down."],
      },
    ],
  });
}

const req = (qs: string) => new Request(`http://localhost/api/exercises${qs}`);

describe.runIf(runDbTests)("exercise library API (DB)", () => {
  beforeEach(async () => {
    await resetDb();
    await seed();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns the whole library by default, sorted by name", async () => {
    const res = await exercisesGET(req(""));
    expect(res.status).toBe(200);
    const { exercises } = await res.json();
    expect(exercises).toHaveLength(2);
    expect(exercises[0].name).toBe("Barbell Back Squat");
  });

  it("filters by a case-insensitive name query", async () => {
    const res = await exercisesGET(req("?q=bench"));
    const { exercises } = await res.json();
    expect(exercises).toHaveLength(1);
    expect(exercises[0].slug).toBe("barbell-bench-press");
    expect(exercises[0].primaryMuscles).toEqual(["CHEST"]);
  });
});
