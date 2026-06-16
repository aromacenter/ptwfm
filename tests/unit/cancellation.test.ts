import { describe, it, expect } from "vitest";
import {
  cancellationOutcome,
  isCancellable,
  hoursUntilStart,
  CANCELLATION_WINDOW_HOURS,
} from "@/lib/booking/cancellation";

const start = new Date("2026-06-20T10:00:00Z");

describe("cancellationOutcome", () => {
  it("is FREE when cancelling more than 24h before", () => {
    const now = new Date("2026-06-19T09:00:00Z"); // 25h before
    expect(cancellationOutcome(start, now)).toBe("FREE");
  });

  it("is FREE exactly 24h before (boundary inclusive)", () => {
    const now = new Date("2026-06-19T10:00:00Z"); // exactly 24h
    expect(cancellationOutcome(start, now)).toBe("FREE");
  });

  it("is LATE just under 24h before", () => {
    const now = new Date("2026-06-19T10:00:01Z"); // 23h59m59s
    expect(cancellationOutcome(start, now)).toBe("LATE");
  });

  it("is LATE shortly before the session", () => {
    const now = new Date("2026-06-20T09:30:00Z"); // 30 min before
    expect(cancellationOutcome(start, now)).toBe("LATE");
  });

  it("is correct across a DST boundary (absolute 24h, not wall-clock)", () => {
    // BST clocks go forward 2026-03-29 01:00->02:00. A session at 10:00 BST
    // on 2026-03-30; 24h earlier in absolute terms is 2026-03-29T09:00Z.
    const dstStart = new Date("2026-03-30T09:00:00Z"); // 10:00 BST
    expect(
      cancellationOutcome(dstStart, new Date("2026-03-29T09:00:00Z")),
    ).toBe("FREE");
    expect(
      cancellationOutcome(dstStart, new Date("2026-03-29T10:00:00Z")),
    ).toBe("LATE");
  });
});

describe("isCancellable", () => {
  it("is true before the start", () => {
    expect(isCancellable(start, new Date("2026-06-20T09:59:59Z"))).toBe(true);
  });
  it("is false at/after the start", () => {
    expect(isCancellable(start, new Date("2026-06-20T10:00:00Z"))).toBe(false);
    expect(isCancellable(start, new Date("2026-06-20T11:00:00Z"))).toBe(false);
  });
});

describe("hoursUntilStart", () => {
  it("computes the remaining hours", () => {
    expect(hoursUntilStart(start, new Date("2026-06-20T08:00:00Z"))).toBe(2);
  });
  it("exposes the 24h window constant", () => {
    expect(CANCELLATION_WINDOW_HOURS).toBe(24);
  });
});
