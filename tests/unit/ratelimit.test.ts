import { describe, it, expect, beforeEach } from "vitest";
import { allowRequest, resetRateLimits } from "@/lib/ratelimit";

describe("allowRequest", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to max requests within the window", () => {
    expect(allowRequest("k", 2, 1000, 0)).toBe(true);
    expect(allowRequest("k", 2, 1000, 100)).toBe(true);
    expect(allowRequest("k", 2, 1000, 200)).toBe(false);
  });

  it("frees up capacity after the window passes", () => {
    expect(allowRequest("k", 1, 1000, 0)).toBe(true);
    expect(allowRequest("k", 1, 1000, 500)).toBe(false);
    expect(allowRequest("k", 1, 1000, 1500)).toBe(true);
  });

  it("tracks keys independently", () => {
    expect(allowRequest("a", 1, 1000, 0)).toBe(true);
    expect(allowRequest("b", 1, 1000, 0)).toBe(true);
  });
});
