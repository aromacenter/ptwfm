import { DateTime } from "luxon";
import { DEFAULT_TIMEZONE } from "@/lib/i18n/format";

// Weekly recurring availability template entry. dayOfWeek: 0 = Sunday .. 6 = Sat.
// Hours are local (trainer timezone), endHour exclusive.
export type RuleInput = {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
};

// One-off override for a specific calendar date.
export type ExceptionInput = {
  date: Date; // calendar date (interpreted by its UTC y-m-d)
  startHour: number;
  endHour: number;
  isBlocked: boolean; // true removes availability, false adds it
};

export type Slot = {
  start: Date; // UTC instant
  end: Date; // UTC instant
  booked: boolean;
};

export type GenerateSlotsParams = {
  rules: readonly RuleInput[];
  exceptions?: readonly ExceptionInput[];
  from: Date;
  to: Date;
  timezone?: string;
  now?: Date; // slots starting at or before `now` are excluded
  bookedStarts?: readonly Date[];
};

function hoursInRange(startHour: number, endHour: number): number[] {
  const hours: number[] = [];
  for (let h = startHour; h < endHour; h++) hours.push(h);
  return hours;
}

/** Computes the bookable local hours for one calendar day. */
export function computeHoursForDay(
  dayOfWeek: number,
  isoDate: string,
  rules: readonly RuleInput[],
  exceptions: readonly ExceptionInput[],
): number[] {
  const set = new Set<number>();

  for (const rule of rules) {
    if (rule.dayOfWeek === dayOfWeek) {
      for (const h of hoursInRange(rule.startHour, rule.endHour)) set.add(h);
    }
  }

  for (const ex of exceptions) {
    const exIso = DateTime.fromJSDate(ex.date, { zone: "utc" }).toISODate();
    if (exIso !== isoDate) continue;
    const hours = hoursInRange(ex.startHour, ex.endHour);
    if (ex.isBlocked) {
      for (const h of hours) set.delete(h);
    } else {
      for (const h of hours) set.add(h);
    }
  }

  return [...set].sort((a, b) => a - b);
}

/**
 * Generates hourly slots between `from` and `to` (inclusive of both calendar
 * days, in the trainer timezone). Timezone-correct across DST via luxon.
 * Past slots are excluded when `now` is supplied; each slot is flagged booked
 * if its start matches an existing appointment.
 */
export function generateSlots(params: GenerateSlotsParams): Slot[] {
  const {
    rules,
    exceptions = [],
    from,
    to,
    timezone = DEFAULT_TIMEZONE,
    now,
    bookedStarts = [],
  } = params;

  const booked = new Set(bookedStarts.map((d) => d.getTime()));
  const slots: Slot[] = [];

  let day = DateTime.fromJSDate(from, { zone: timezone }).startOf("day");
  const last = DateTime.fromJSDate(to, { zone: timezone }).startOf("day");

  while (day <= last) {
    // luxon weekday: 1 = Monday .. 7 = Sunday -> 0 = Sunday .. 6 = Saturday
    const dayOfWeek = day.weekday % 7;
    const isoDate = day.toISODate()!;
    const hours = computeHoursForDay(dayOfWeek, isoDate, rules, exceptions);

    for (const h of hours) {
      const startDt = day.set({ hour: h, minute: 0, second: 0, millisecond: 0 });
      // On the spring-forward day the gap hour (e.g. 01:00) does not exist and
      // luxon shifts it forward; skip it so we don't emit a duplicate slot.
      if (startDt.hour !== h) continue;
      const start = startDt.toJSDate();
      const end = startDt.plus({ hours: 1 }).toJSDate();
      if (now && start.getTime() <= now.getTime()) continue;
      slots.push({ start, end, booked: booked.has(start.getTime()) });
    }

    day = day.plus({ days: 1 });
  }

  return slots;
}
