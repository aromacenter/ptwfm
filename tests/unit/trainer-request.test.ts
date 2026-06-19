import { describe, it, expect } from "vitest";
import { trainerRequestSchema } from "@/lib/validation/trainer-request";

const valid = {
  name: "Jane",
  email: "jane@example.com",
  goal: "Lose weight before summer",
  consent: true,
};

describe("trainerRequestSchema", () => {
  it("accepts a valid request and defaults optional fields", () => {
    const parsed = trainerRequestSchema.parse(valid);
    expect(parsed.city).toBe("");
    expect(parsed.online).toBe(false);
  });

  it("requires explicit consent", () => {
    expect(trainerRequestSchema.safeParse({ ...valid, consent: false }).success).toBe(
      false,
    );
    const noConsent = { name: valid.name, email: valid.email, goal: valid.goal };
    expect(trainerRequestSchema.safeParse(noConsent).success).toBe(false);
  });

  it("rejects an invalid email and an empty goal", () => {
    expect(trainerRequestSchema.safeParse({ ...valid, email: "nope" }).success).toBe(
      false,
    );
    expect(trainerRequestSchema.safeParse({ ...valid, goal: "" }).success).toBe(false);
  });
});
