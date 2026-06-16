import { describe, it, expect } from "vitest";
import {
  latestConsent,
  hasActiveConsent,
  needsReconsent,
  type ConsentRecord,
} from "@/lib/gdpr/consent";

function rec(partial: Partial<ConsentRecord>): ConsentRecord {
  return {
    type: "HEALTH_DATA",
    version: "1.0",
    granted: true,
    grantedAt: new Date("2026-01-01T00:00:00Z"),
    withdrawnAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...partial,
  };
}

describe("latestConsent", () => {
  it("returns the most recent record of a type", () => {
    const older = rec({ createdAt: new Date("2026-01-01T00:00:00Z") });
    const newer = rec({
      createdAt: new Date("2026-03-01T00:00:00Z"),
      granted: false,
      withdrawnAt: new Date("2026-03-01T00:00:00Z"),
    });
    expect(latestConsent([older, newer], "HEALTH_DATA")).toBe(newer);
  });

  it("returns undefined when no record matches", () => {
    expect(latestConsent([rec({})], "MARKETING")).toBeUndefined();
  });
});

describe("hasActiveConsent", () => {
  it("is true for a granted, non-withdrawn latest consent", () => {
    expect(hasActiveConsent([rec({})], "HEALTH_DATA")).toBe(true);
  });

  it("is false when the latest consent was withdrawn", () => {
    const granted = rec({ createdAt: new Date("2026-01-01T00:00:00Z") });
    const withdrawn = rec({
      createdAt: new Date("2026-02-01T00:00:00Z"),
      granted: false,
      withdrawnAt: new Date("2026-02-01T00:00:00Z"),
    });
    expect(hasActiveConsent([granted, withdrawn], "HEALTH_DATA")).toBe(false);
  });

  it("is false when there is no consent at all", () => {
    expect(hasActiveConsent([], "HEALTH_DATA")).toBe(false);
  });

  it("re-granting after withdrawal restores active consent", () => {
    const withdrawn = rec({
      createdAt: new Date("2026-02-01T00:00:00Z"),
      granted: false,
      withdrawnAt: new Date("2026-02-01T00:00:00Z"),
    });
    const regranted = rec({ createdAt: new Date("2026-04-01T00:00:00Z") });
    expect(hasActiveConsent([withdrawn, regranted], "HEALTH_DATA")).toBe(true);
  });
});

describe("needsReconsent", () => {
  it("is true when the active consent is an old version", () => {
    expect(needsReconsent([rec({ version: "0.9" })], "HEALTH_DATA", "1.0")).toBe(
      true,
    );
  });

  it("is false when the active consent matches the current version", () => {
    expect(needsReconsent([rec({ version: "1.0" })], "HEALTH_DATA", "1.0")).toBe(
      false,
    );
  });

  it("is false when there is no active consent", () => {
    expect(needsReconsent([], "HEALTH_DATA", "1.0")).toBe(false);
  });
});
