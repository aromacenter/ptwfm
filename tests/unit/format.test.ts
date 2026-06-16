import { describe, it, expect } from "vitest";
import {
  formatMoney,
  formatDateTime,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
} from "@/lib/i18n/format";

describe("formatMoney", () => {
  it("formats pence as GBP for English (en-GB)", () => {
    expect(formatMoney(1299, "en")).toBe("£12.99");
  });

  it("rounds to two decimals and includes the GBP symbol", () => {
    expect(formatMoney(5000, "en")).toBe("£50.00");
    expect(formatMoney(0, "en")).toBe("£0.00");
  });

  it("formats with Hungarian locale but still GBP currency", () => {
    const result = formatMoney(1299, "hu");
    // hu-HU groups differently and places the currency code, but it is GBP.
    expect(result).toContain("12,99");
    expect(result).toMatch(/GBP|£/);
  });

  it("defaults to GBP currency", () => {
    expect(DEFAULT_CURRENCY).toBe("GBP");
  });

  it("falls back to en-GB for an unknown locale", () => {
    expect(formatMoney(100, "xx")).toBe("£1.00");
  });
});

describe("formatDateTime", () => {
  it("renders a date in Europe/London by default", () => {
    // 2026-06-16T09:30:00Z -> BST (UTC+1) -> 10:30
    const date = new Date("2026-06-16T09:30:00Z");
    const result = formatDateTime(date, "en");
    expect(result).toContain("2026");
    expect(result).toMatch(/10:30/);
  });

  it("honours an explicit timezone override", () => {
    const date = new Date("2026-06-16T09:30:00Z");
    const budapest = formatDateTime(date, "hu", "Europe/Budapest");
    // Budapest is UTC+2 in summer -> 11:30
    expect(budapest).toMatch(/11:30/);
  });

  it("exposes Europe/London as the default timezone", () => {
    expect(DEFAULT_TIMEZONE).toBe("Europe/London");
  });
});
