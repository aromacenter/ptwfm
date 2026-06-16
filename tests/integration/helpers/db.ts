import { prisma } from "@/lib/db";

// Whether DB-backed integration tests should run. CI sets RUN_DB_TESTS=1 and
// provisions a Postgres service; locally they are skipped unless opted in.
export const runDbTests = !!process.env.RUN_DB_TESTS;

const TABLES = [
  "AuditLog",
  "Consent",
  "DataRequest",
  "HealthNote",
  "Payment",
  "SessionCredit",
  "CreditPack",
  "PaymentMethod",
  "Appointment",
  "PlanItem",
  "TrainingPlan",
  "AvailabilityRule",
  "AvailabilityException",
  "AiInsight",
  "ClientProfile",
  "TrainerProfile",
  "User",
];

/** Empties all tables so each test starts from a clean slate. */
export async function resetDb() {
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`,
  );
}
