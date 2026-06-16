import { describe, it, expect } from "vitest";
import {
  generateSlots,
  computeHoursForDay,
  type RuleInput,
} from "@/lib/booking/slots";

// Helper: a single weekday rule.
const rule = (dayOfWeek: number, startHour: number, endHour: number): RuleInput => ({
  dayOfWeek,
  startHour,
  endHour,
});

describe("computeHoursForDay", () => {
  it("expands a rule into hourly slots (endHour exclusive)", () => {
    expect(
      computeHoursForDay(1, "2026-06-15", [rule(1, 9, 12)], []),
    ).toEqual([9, 10, 11]);
  });

  it("unions overlapping rules on the same day", () => {
    const hours = computeHoursForDay(
      1,
      "2026-06-15",
      [rule(1, 9, 11), rule(1, 10, 13)],
      [],
    );
    expect(hours).toEqual([9, 10, 11, 12]);
  });

  it("removes hours blocked by an exception", () => {
    const hours = computeHoursForDay(1, "2026-06-15", [rule(1, 9, 12)], [
      { date: new Date("2026-06-15T00:00:00Z"), startHour: 10, endHour: 11, isBlocked: true },
    ]);
    expect(hours).toEqual([9, 11]);
  });

  it("adds extra hours from a non-blocking exception", () => {
    const hours = computeHoursForDay(1, "2026-06-15", [rule(1, 9, 10)], [
      { date: new Date("2026-06-15T00:00:00Z"), startHour: 17, endHour: 19, isBlocked: false },
    ]);
    expect(hours).toEqual([9, 17, 18]);
  });

  it("ignores exceptions on other dates", () => {
    const hours = computeHoursForDay(1, "2026-06-15", [rule(1, 9, 11)], [
      { date: new Date("2026-06-22T00:00:00Z"), startHour: 9, endHour: 11, isBlocked: true },
    ]);
    expect(hours).toEqual([9, 10]);
  });
});

describe("generateSlots — timezone correctness (Europe/London)", () => {
  it("maps local hours to UTC during BST (summer, UTC+1)", () => {
    // 2026-06-15 is a Monday in BST.
    const slots = generateSlots({
      rules: [rule(1, 9, 11)],
      from: new Date("2026-06-15T00:00:00Z"),
      to: new Date("2026-06-15T23:59:59Z"),
    });
    expect(slots).toHaveLength(2);
    // 09:00 London BST == 08:00 UTC
    expect(slots[0].start.toISOString()).toBe("2026-06-15T08:00:00.000Z");
    expect(slots[0].end.toISOString()).toBe("2026-06-15T09:00:00.000Z");
    expect(slots[1].start.toISOString()).toBe("2026-06-15T09:00:00.000Z");
  });

  it("maps local hours to UTC during GMT (winter, UTC+0)", () => {
    // 2026-01-19 is a Monday in GMT.
    const slots = generateSlots({
      rules: [rule(1, 9, 10)],
      from: new Date("2026-01-19T00:00:00Z"),
      to: new Date("2026-01-19T23:59:59Z"),
    });
    expect(slots).toHaveLength(1);
    // 09:00 London GMT == 09:00 UTC
    expect(slots[0].start.toISOString()).toBe("2026-01-19T09:00:00.000Z");
  });

  it("does not crash on the spring-forward day", () => {
    // 2026-03-29: clocks go 01:00 -> 02:00 in London.
    const slots = generateSlots({
      rules: [rule(0, 0, 4)], // Sunday 00:00-03:00 local
      from: new Date("2026-03-29T00:00:00Z"),
      to: new Date("2026-03-29T23:59:59Z"),
    });
    // The non-existent 01:00 hour is normalised by luxon; we just require
    // valid, strictly increasing UTC instants and no throw.
    expect(slots.length).toBeGreaterThan(0);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].start.getTime()).toBeGreaterThan(slots[i - 1].start.getTime());
    }
  });
});

describe("generateSlots — filtering", () => {
  it("flags booked slots by matching start instant", () => {
    const slots = generateSlots({
      rules: [rule(1, 9, 11)],
      from: new Date("2026-06-15T00:00:00Z"),
      to: new Date("2026-06-15T23:59:59Z"),
      bookedStarts: [new Date("2026-06-15T08:00:00Z")], // 09:00 BST
    });
    expect(slots[0].booked).toBe(true);
    expect(slots[1].booked).toBe(false);
  });

  it("excludes slots starting at or before now", () => {
    const slots = generateSlots({
      rules: [rule(1, 9, 12)],
      from: new Date("2026-06-15T00:00:00Z"),
      to: new Date("2026-06-15T23:59:59Z"),
      now: new Date("2026-06-15T08:30:00Z"), // after 09:00 BST (08:00 UTC) slot
    });
    // 09:00 BST (08:00 UTC) is in the past; 10:00 and 11:00 remain.
    expect(slots.map((s) => s.start.toISOString())).toEqual([
      "2026-06-15T09:00:00.000Z",
      "2026-06-15T10:00:00.000Z",
    ]);
  });

  it("generates across multiple days", () => {
    const slots = generateSlots({
      rules: [rule(1, 9, 10), rule(2, 9, 10)], // Mon + Tue
      from: new Date("2026-06-15T00:00:00Z"), // Monday
      to: new Date("2026-06-16T23:59:59Z"), // Tuesday
    });
    expect(slots).toHaveLength(2);
  });
});
