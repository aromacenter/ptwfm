import { prisma } from "@/lib/db";
import { generateSlots, type Slot } from "./slots";
import { isSlotBookable } from "./availability";

// Statuses that occupy a slot (so it can't be double-booked).
const ACTIVE_STATUSES = ["BOOKED", "COMPLETED", "NO_SHOW"] as const;

async function loadAvailability(trainerId: string, from: Date, to: Date) {
  const [trainer, rules, exceptions, booked] = await Promise.all([
    prisma.trainerProfile.findUnique({
      where: { id: trainerId },
      select: { timezone: true },
    }),
    prisma.availabilityRule.findMany({ where: { trainerId } }),
    prisma.availabilityException.findMany({ where: { trainerId } }),
    prisma.appointment.findMany({
      where: {
        trainerId,
        status: { in: [...ACTIVE_STATUSES] },
        startAt: { gte: from, lte: to },
      },
      select: { startAt: true },
    }),
  ]);
  return {
    timezone: trainer?.timezone ?? undefined,
    rules,
    exceptions,
    bookedStarts: booked.map((b) => b.startAt),
  };
}

/** Returns the trainer's slots between two instants, flagged booked. */
export async function getTrainerSlots(
  trainerId: string,
  from: Date,
  to: Date,
  now: Date = new Date(),
): Promise<Slot[]> {
  const { timezone, rules, exceptions, bookedStarts } = await loadAvailability(
    trainerId,
    from,
    to,
  );
  return generateSlots({
    rules,
    exceptions,
    from,
    to,
    timezone,
    now,
    bookedStarts,
  });
}

/** Server-side validation that a specific start instant is bookable. */
export async function canBook(
  trainerId: string,
  start: Date,
  now: Date = new Date(),
): Promise<boolean> {
  const dayStart = new Date(start);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setUTCHours(23, 59, 59, 999);
  const { timezone, rules, exceptions, bookedStarts } = await loadAvailability(
    trainerId,
    dayStart,
    dayEnd,
  );
  return isSlotBookable({
    start,
    rules,
    exceptions,
    timezone,
    now,
    bookedStarts,
  });
}
