export type MacroItem = {
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};
export type MealLike = { items: MacroItem[] };
export type MacroTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** Sums the macros across all meals/items (missing values count as 0). Pure. */
export function computeNutritionTotals(meals: readonly MealLike[]): MacroTotals {
  const totals: MacroTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const meal of meals) {
    for (const item of meal.items) {
      totals.kcal += item.kcal ?? 0;
      totals.protein += item.protein ?? 0;
      totals.carbs += item.carbs ?? 0;
      totals.fat += item.fat ?? 0;
    }
  }
  // Round to avoid floating-point noise from gram fractions.
  return {
    kcal: Math.round(totals.kcal),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
  };
}
