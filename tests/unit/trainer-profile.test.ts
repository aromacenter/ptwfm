import { describe, it, expect } from "vitest";
import { trainerProfileSchema } from "@/lib/validation/trainer";

describe("trainerProfileSchema", () => {
  const base = {
    headline: "Coach",
    bio: "Experienced trainer.",
    acceptingClients: true,
    hourlyRatePence: 4500,
  };

  it("accepts a valid profile", () => {
    expect(trainerProfileSchema.safeParse(base).success).toBe(true);
  });

  it("allows empty headline and bio", () => {
    expect(
      trainerProfileSchema.safeParse({ ...base, headline: "", bio: "" }).success,
    ).toBe(true);
  });

  it("rejects a negative rate", () => {
    expect(
      trainerProfileSchema.safeParse({ ...base, hourlyRatePence: -1 }).success,
    ).toBe(false);
  });

  it("rejects a non-integer rate", () => {
    expect(
      trainerProfileSchema.safeParse({ ...base, hourlyRatePence: 45.5 }).success,
    ).toBe(false);
  });

  it("rejects an over-long headline", () => {
    expect(
      trainerProfileSchema.safeParse({ ...base, headline: "x".repeat(121) })
        .success,
    ).toBe(false);
  });
});
