import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validation/auth";

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "anything",
    });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const base = {
    name: "Jane Doe",
    email: "jane@example.com",
    password: "longenough1",
    termsConsent: true as const,
  };

  it("accepts a valid trainer registration without health consent", () => {
    const result = registerSchema.safeParse({
      ...base,
      role: "TRAINER",
      healthConsent: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid client registration with health consent", () => {
    const result = registerSchema.safeParse({
      ...base,
      role: "CLIENT",
      healthConsent: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a client without explicit health consent", () => {
    const result = registerSchema.safeParse({
      ...base,
      role: "CLIENT",
      healthConsent: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "healthConsent")).toBe(
        true,
      );
    }
  });

  it("rejects when terms are not accepted", () => {
    const result = registerSchema.safeParse({
      ...base,
      termsConsent: false,
      role: "TRAINER",
      healthConsent: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      ...base,
      password: "short",
      role: "TRAINER",
      healthConsent: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = registerSchema.safeParse({
      ...base,
      name: "   ",
      role: "TRAINER",
      healthConsent: false,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a client with a valid goal", () => {
    const result = registerSchema.safeParse({
      ...base,
      role: "CLIENT",
      healthConsent: true,
      goal: "WEIGHT_LOSS",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.goal).toBe("WEIGHT_LOSS");
  });

  it("treats goal as optional", () => {
    const result = registerSchema.safeParse({
      ...base,
      role: "CLIENT",
      healthConsent: true,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.goal).toBeUndefined();
  });

  it("rejects an unknown goal value", () => {
    const result = registerSchema.safeParse({
      ...base,
      role: "CLIENT",
      healthConsent: true,
      goal: "BECOME_RICH",
    });
    expect(result.success).toBe(false);
  });
});
