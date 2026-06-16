import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("password123", {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const trainer = await prisma.user.upsert({
    where: { email: "trainer@example.com" },
    update: {},
    create: {
      email: "trainer@example.com",
      name: "Sam Trainer",
      passwordHash,
      role: "TRAINER",
      trainerProfile: {
        create: {
          hourlyRatePence: 4500,
          availabilityRules: {
            create: [
              { dayOfWeek: 1, startHour: 9, endHour: 17 },
              { dayOfWeek: 3, startHour: 9, endHour: 17 },
              { dayOfWeek: 5, startHour: 9, endHour: 13 },
            ],
          },
        },
      },
    },
    include: { trainerProfile: true },
  });

  await prisma.user.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      email: "client@example.com",
      name: "Alex Client",
      passwordHash,
      role: "CLIENT",
      clientProfile: { create: { trainerId: trainer.trainerProfile!.id } },
      consents: {
        create: [
          { type: "TERMS", version: "1.0", granted: true, grantedAt: new Date() },
          { type: "HEALTH_DATA", version: "1.0", granted: true, grantedAt: new Date() },
        ],
      },
    },
  });

  console.log("Seeded trainer@example.com and client@example.com (password123)");
  console.log(`Trainer profile id (booking link): ${trainer.trainerProfile!.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
