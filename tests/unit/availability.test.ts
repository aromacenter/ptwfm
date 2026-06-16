import { describe, it, expect } from "vitest";
import { isSlotBookable } from "@/lib/booking/availability";
import { availabilityRuleSchema, bookingSchema } from "@/lib/validation/booking";

const rules = [{ dayOfWeek: 1, startHour: 9, endHour: 12 }]; // Monday 09-12 local

describe("isSlotBookable", () => {
  it("accepts a slot offered by the rules (BST)", () => {
    // 2026-06-15 Monday, 09:00 BST == 08:00 UTC
    expect(
      isSlotBookable({ start: new Date("2026-06-15T08:00:00Z"), rules }),
    ).toBe(true);
  });

  it("rejects a slot outside the offered hours", () => {
    expect(
      isSlotBookable({ start: new Date("2026-06-15T12:00:00Z"), rules }),
    ).toBe(false);
  });

  it("rejects an already-booked slot", () => {
    expect(
      isSlotBookable({
        start: new Date("2026-06-15T08:00:00Z"),
        rules,
        bookedStarts: [new Date("2026-06-15T08:00:00Z")],
      }),
    ).toBe(false);
  });

  it("rejects a slot in the past", () => {
    expect(
      isSlotBookable({
        start: new Date("2026-06-15T08:00:00Z"),
        rules,
        now: new Date("2026-06-15T10:00:00Z"),
      }),
    ).toBe(false);
  });
});

describe("availabilityRuleSchema", () => {
  it("accepts a valid rule", () => {
    expect(
      availabilityRuleSchema.safeParse({ dayOfWeek: 1, startHour: 9, endHour: 12 })
        .success,
    ).toBe(true);
  });

  it("rejects startHour >= endHour", () => {
    expect(
      availabilityRuleSchema.safeParse({ dayOfWeek: 1, startHour: 12, endHour: 9 })
        .success,
    ).toBe(false);
  });

  it("rejects an out-of-range day", () => {
    expect(
      availabilityRuleSchema.safeParse({ dayOfWeek: 7, startHour: 9, endHour: 12 })
        .success,
    ).toBe(false);
  });
});

describe("bookingSchema", () => {
  it("accepts a trainerId and ISO datetime", () => {
    expect(
      bookingSchema.safeParse({
        trainerId: "abc",
        start: "2026-06-15T08:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("rejects a non-ISO start", () => {
    expect(
      bookingSchema.safeParse({ trainerId: "abc", start: "next monday" }).success,
    ).toBe(false);
  });
});
