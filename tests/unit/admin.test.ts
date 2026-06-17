import { describe, it, expect, afterEach } from "vitest";
import { isAdmin } from "@/lib/auth/admin";

const orig = process.env.ADMIN_EMAILS;
afterEach(() => {
  process.env.ADMIN_EMAILS = orig;
});

describe("isAdmin", () => {
  it("is false for null", () => {
    expect(isAdmin(null)).toBe(false);
  });

  it("is true for the ADMIN role", () => {
    expect(isAdmin({ role: "ADMIN", email: "x@example.com" })).toBe(true);
  });

  it("is false for non-admin roles not in ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    expect(isAdmin({ role: "TRAINER", email: "x@example.com" })).toBe(false);
  });

  it("grants access via ADMIN_EMAILS (case-insensitive)", () => {
    process.env.ADMIN_EMAILS = "Boss@Example.com, other@x.com";
    expect(isAdmin({ role: "TRAINER", email: "boss@example.com" })).toBe(true);
  });
});
