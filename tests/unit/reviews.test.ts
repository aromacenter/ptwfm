import { describe, it, expect } from "vitest";
import { summariseRatings, normaliseRating } from "@/lib/reviews";

describe("summariseRatings", () => {
  it("returns null average and zero count for no reviews", () => {
    expect(summariseRatings([])).toEqual({ average: null, count: 0 });
  });

  it("averages a single rating", () => {
    expect(summariseRatings([4])).toEqual({ average: 4, count: 1 });
  });

  it("rounds the average to one decimal place", () => {
    // (5 + 4 + 4) / 3 = 4.333... -> 4.3
    expect(summariseRatings([5, 4, 4])).toEqual({ average: 4.3, count: 3 });
  });

  it("handles all-five reviews", () => {
    expect(summariseRatings([5, 5, 5])).toEqual({ average: 5, count: 3 });
  });
});

describe("normaliseRating", () => {
  it("accepts valid 1..5 integers", () => {
    expect(normaliseRating(1)).toBe(1);
    expect(normaliseRating(5)).toBe(5);
  });

  it("rounds nearby values", () => {
    expect(normaliseRating("4")).toBe(4);
    expect(normaliseRating(3.4)).toBe(3);
  });

  it("rejects out-of-range and non-numeric values", () => {
    expect(normaliseRating(0)).toBeNull();
    expect(normaliseRating(6)).toBeNull();
    expect(normaliseRating("abc")).toBeNull();
    expect(normaliseRating(null)).toBeNull();
  });
});
