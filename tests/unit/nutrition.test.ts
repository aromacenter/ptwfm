import { describe, it, expect } from "vitest";
import { computeNutritionTotals } from "@/lib/plans/nutrition";

describe("computeNutritionTotals", () => {
  it("sums macros across meals and items", () => {
    const totals = computeNutritionTotals([
      {
        items: [
          { kcal: 300, protein: 30, carbs: 20, fat: 10 },
          { kcal: 150, protein: 5, carbs: 30, fat: 2 },
        ],
      },
      { items: [{ kcal: 500, protein: 40, carbs: 50, fat: 15 }] },
    ]);
    expect(totals).toEqual({ kcal: 950, protein: 75, carbs: 100, fat: 27 });
  });

  it("treats missing macros as zero", () => {
    expect(
      computeNutritionTotals([{ items: [{ kcal: 200 }, { protein: 10 }] }]),
    ).toEqual({ kcal: 200, protein: 10, carbs: 0, fat: 0 });
  });

  it("returns zeros for an empty plan", () => {
    expect(computeNutritionTotals([])).toEqual({
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });

  it("rounds fractional gram totals", () => {
    const totals = computeNutritionTotals([
      { items: [{ protein: 10.4 }, { protein: 10.4 }] },
    ]);
    expect(totals.protein).toBe(21);
  });
});
