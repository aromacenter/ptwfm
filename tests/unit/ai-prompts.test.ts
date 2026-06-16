import { describe, it, expect } from "vitest";
import {
  computeUtilisation,
  buildSchedulePrompt,
  buildClientSummaryPrompt,
} from "@/lib/ai/prompts";

describe("computeUtilisation", () => {
  it("returns a rounded percentage", () => {
    expect(computeUtilisation(10, 5)).toBe(50);
    expect(computeUtilisation(3, 1)).toBe(33);
  });
  it("returns 0 when there are no slots", () => {
    expect(computeUtilisation(0, 0)).toBe(0);
  });
});

describe("buildSchedulePrompt", () => {
  const prompt = buildSchedulePrompt({
    weekStart: "2026-06-15",
    days: [
      { day: "Monday", total: 8, booked: 4 },
      { day: "Tuesday", total: 8, booked: 8 },
    ],
  });

  it("includes per-day figures and overall utilisation", () => {
    expect(prompt).toContain("Monday: 4/8");
    expect(prompt).toContain("Tuesday: 8/8");
    expect(prompt).toContain("75%"); // 12/16
  });

  it("does not leak identifying data", () => {
    expect(prompt).not.toMatch(/@/); // no emails
  });
});

describe("buildClientSummaryPrompt", () => {
  const prompt = buildClientSummaryPrompt({
    sessionsCompleted: 12,
    lateCancellations: 1,
    upcoming: 2,
    notes: ["Knee injury — avoid deep squats"],
    planItems: ["Squat 3x5", "Run 5k"],
  });

  it("includes the supplied stats and notes", () => {
    expect(prompt).toContain("Sessions completed: 12");
    expect(prompt).toContain("Knee injury");
    expect(prompt).toContain("Squat 3x5");
  });

  it("instructs not to identify the person and contains no email", () => {
    expect(prompt.toLowerCase()).toContain("do not invent");
    expect(prompt).not.toMatch(/@/);
  });

  it("handles empty notes and plan gracefully", () => {
    const p = buildClientSummaryPrompt({
      sessionsCompleted: 0,
      lateCancellations: 0,
      upcoming: 0,
      notes: [],
      planItems: [],
    });
    expect(p).toContain("(none)");
  });
});
