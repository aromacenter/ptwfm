import { describe, it, expect } from "vitest";
import {
  computePackagePrice,
  priceForPackage,
  getPackageOption,
  pickConsumableCredit,
  type ConsumableCredit,
} from "@/lib/payments/pricing";

describe("computePackagePrice", () => {
  it("multiplies rate by sessions with no discount", () => {
    expect(computePackagePrice(4500, 1, 0)).toBe(4500);
    expect(computePackagePrice(4500, 5, 0)).toBe(22500);
  });

  it("applies a percentage discount and rounds to pence", () => {
    // 4500 * 12 = 54000; 10% off = 48600
    expect(computePackagePrice(4500, 12, 10)).toBe(48600);
    // 4500 * 5 = 22500; 5% off = 21375
    expect(computePackagePrice(4500, 5, 5)).toBe(21375);
  });

  it("rounds non-integer results", () => {
    // 3333 * 5 = 16665; 5% off = 15831.75 -> 15832
    expect(computePackagePrice(3333, 5, 5)).toBe(15832);
  });

  it("throws on invalid inputs", () => {
    expect(() => computePackagePrice(-1, 1, 0)).toThrow();
    expect(() => computePackagePrice(4500, 0, 0)).toThrow();
  });
});

describe("priceForPackage / getPackageOption", () => {
  it("prices the 12-session pack from the catalogue", () => {
    const opt = getPackageOption("pack12")!;
    expect(priceForPackage(4500, opt)).toBe(48600);
  });

  it("returns undefined for an unknown package id", () => {
    expect(getPackageOption("nope")).toBeUndefined();
  });
});

describe("pickConsumableCredit", () => {
  const now = new Date("2026-06-16T00:00:00Z");
  const credit = (over: Partial<ConsumableCredit>): ConsumableCredit => ({
    id: "c",
    usedAt: null,
    expiresAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...over,
  });

  it("returns null when there are no usable credits", () => {
    expect(pickConsumableCredit([], now)).toBeNull();
    expect(
      pickConsumableCredit([credit({ usedAt: new Date() })], now),
    ).toBeNull();
  });

  it("skips expired credits", () => {
    expect(
      pickConsumableCredit(
        [credit({ id: "x", expiresAt: new Date("2026-05-01T00:00:00Z") })],
        now,
      ),
    ).toBeNull();
  });

  it("prefers the credit expiring soonest", () => {
    const soon = credit({ id: "soon", expiresAt: new Date("2026-07-01T00:00:00Z") });
    const later = credit({ id: "later", expiresAt: new Date("2026-12-01T00:00:00Z") });
    const never = credit({ id: "never", expiresAt: null });
    expect(pickConsumableCredit([never, later, soon], now)?.id).toBe("soon");
  });

  it("uses createdAt as a tiebreak", () => {
    const a = credit({ id: "a", createdAt: new Date("2026-02-01T00:00:00Z") });
    const b = credit({ id: "b", createdAt: new Date("2026-01-01T00:00:00Z") });
    expect(pickConsumableCredit([a, b], now)?.id).toBe("b");
  });
});
