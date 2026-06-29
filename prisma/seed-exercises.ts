// Idempotent seed for the global exercise library. Safe to re-run: upserts by
// slug. Run with: npx tsx prisma/seed-exercises.ts
import { PrismaClient } from "@prisma/client";
import { EXERCISES } from "../src/lib/exercises/data";

const prisma = new PrismaClient();

async function main() {
  for (const e of EXERCISES) {
    await prisma.exercise.upsert({
      where: { slug: e.slug },
      create: e,
      update: {
        name: e.name,
        category: e.category,
        equipment: e.equipment,
        primaryMuscles: e.primaryMuscles,
        secondaryMuscles: e.secondaryMuscles,
        cues: e.cues,
      },
    });
  }
  const count = await prisma.exercise.count();
  console.log(`Seeded exercises. Library now has ${count} entries.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
