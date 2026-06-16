import { generateSlots, type RuleInput, type ExceptionInput } from "./slots";

/** True when an hourly slot starting at `start` is offered by the trainer's
 * availability (rules + exceptions) and not already booked. Used server-side
 * to validate a booking request before writing it. */
export function isSlotBookable(params: {
  start: Date;
  rules: readonly RuleInput[];
  exceptions?: readonly ExceptionInput[];
  timezone?: string;
  now?: Date;
  bookedStarts?: readonly Date[];
}): boolean {
  const { start } = params;
  // Generate the slots for that single day and look for an available match.
  const dayStart = new Date(start);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const slots = generateSlots({
    rules: params.rules,
    exceptions: params.exceptions,
    from: dayStart,
    to: dayEnd,
    timezone: params.timezone,
    now: params.now,
    bookedStarts: params.bookedStarts,
  });

  return slots.some(
    (s) => s.start.getTime() === start.getTime() && !s.booked,
  );
}
