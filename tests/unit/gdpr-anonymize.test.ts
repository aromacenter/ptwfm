import { describe, it, expect } from "vitest";
import {
  buildErasureUserUpdate,
  isBillingRecordDeletable,
  BILLING_RETENTION_YEARS,
} from "@/lib/gdpr/anonymize";

describe("buildErasureUserUpdate", () => {
  it("produces a non-routable, unique placeholder email tied to the id", () => {
    const update = buildErasureUserUpdate("user_123");
    expect(update.email).toBe("erased-user_123@deleted.invalid");
  });

  it("clears name, phone and password hash", () => {
    const update = buildErasureUserUpdate("user_123");
    expect(update.name).toBe("Erased user");
    expect(update.phone).toBeNull();
    expect(update.passwordHash).toBe("");
  });

  it("yields distinct emails for distinct users (unique constraint safe)", () => {
    expect(buildErasureUserUpdate("a").email).not.toBe(
      buildErasureUserUpdate("b").email,
    );
  });
});

describe("isBillingRecordDeletable", () => {
  const asOf = new Date("2026-06-16T00:00:00Z");

  it("keeps records within the retention window", () => {
    const recent = new Date("2024-06-16T00:00:00Z"); // 2 years old
    expect(isBillingRecordDeletable(recent, asOf)).toBe(false);
  });

  it("allows deletion once past the retention window", () => {
    const old = new Date("2019-06-15T00:00:00Z"); // > 6 years old
    expect(isBillingRecordDeletable(old, asOf)).toBe(true);
  });

  it("treats the exact boundary as not yet deletable", () => {
    const boundary = new Date(asOf);
    boundary.setFullYear(boundary.getFullYear() - BILLING_RETENTION_YEARS);
    expect(isBillingRecordDeletable(boundary, asOf)).toBe(false);
  });
});
