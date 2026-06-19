"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { computeNutritionTotals } from "@/lib/plans/nutrition";

type Item = {
  food: string;
  qty: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};
type Meal = { name: string; items: Item[] };
type Plan = { id: string; title: string; data: { notes?: string; meals: Meal[] } };

const emptyItem = (): Item => ({
  food: "",
  qty: "",
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
});
const emptyMeal = (): Meal => ({ name: "", items: [emptyItem()] });

export function NutritionBuilder({
  clientId,
  initial,
}: {
  clientId: string;
  initial: Plan[];
}) {
  const t = useTranslations("plans");
  const [plans, setPlans] = useState<Plan[]>(initial);
  const [title, setTitle] = useState("");
  const [meals, setMeals] = useState<Meal[]>([emptyMeal()]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  const totals = computeNutritionTotals(meals);

  function patchItem(mi: number, ii: number, patch: Partial<Item>) {
    setMeals((m) =>
      m.map((meal, idx) =>
        idx === mi
          ? {
              ...meal,
              items: meal.items.map((it, j) =>
                j === ii ? { ...it, ...patch } : it,
              ),
            }
          : meal,
      ),
    );
  }

  async function save() {
    if (title.trim() === "") return;
    setPending(true);
    setError(false);
    const res = await fetch(`/api/clients/${clientId}/nutrition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, notes: "", meals }),
    });
    setPending(false);
    if (res.ok) {
      const { plan } = (await res.json()) as { plan: Plan };
      setPlans((p) => [plan, ...p]);
      setTitle("");
      setMeals([emptyMeal()]);
    } else {
      setError(true);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/clients/${clientId}/nutrition?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) setPlans((p) => p.filter((x) => x.id !== id));
  }

  const num = (v: string) => Number(v) || 0;

  return (
    <div className="space-y-4">
      {plans.length === 0 ? (
        <p className="text-sm text-foreground/60">{t("noNutrition")}</p>
      ) : (
        <ul className="space-y-2">
          {plans.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded border border-foreground/15 px-4 py-3 text-sm"
            >
              <strong>{p.title}</strong>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="rounded-full border border-foreground/20 px-3 py-1.5 text-xs"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <details className="rounded border border-foreground/15 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          {t("newNutrition")}
        </summary>
        <div className="mt-3 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("planTitle")}
            className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />

          {meals.map((meal, mi) => (
            <div key={mi} className="space-y-2 rounded border border-foreground/10 p-3">
              <div className="flex gap-2">
                <input
                  value={meal.name}
                  onChange={(e) =>
                    setMeals((m) =>
                      m.map((x, i) => (i === mi ? { ...x, name: e.target.value } : x)),
                    )
                  }
                  placeholder={t("mealName")}
                  className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm"
                />
                {meals.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setMeals((m) => m.filter((_, i) => i !== mi))}
                    className="shrink-0 rounded-full border border-foreground/20 px-3 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
              {meal.items.map((it, ii) => (
                <div key={ii} className="flex flex-wrap gap-2">
                  <input
                    value={it.food}
                    onChange={(e) => patchItem(mi, ii, { food: e.target.value })}
                    placeholder={t("food")}
                    className="min-w-[7rem] flex-1 rounded border border-foreground/20 bg-transparent px-2 py-1.5 text-sm"
                  />
                  <input
                    value={it.qty}
                    onChange={(e) => patchItem(mi, ii, { qty: e.target.value })}
                    placeholder={t("qty")}
                    className="w-16 rounded border border-foreground/20 bg-transparent px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    value={it.kcal || ""}
                    onChange={(e) => patchItem(mi, ii, { kcal: num(e.target.value) })}
                    placeholder={t("kcal")}
                    className="w-16 rounded border border-foreground/20 bg-transparent px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    value={it.protein || ""}
                    onChange={(e) => patchItem(mi, ii, { protein: num(e.target.value) })}
                    placeholder="P"
                    className="w-14 rounded border border-foreground/20 bg-transparent px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    value={it.carbs || ""}
                    onChange={(e) => patchItem(mi, ii, { carbs: num(e.target.value) })}
                    placeholder="C"
                    className="w-14 rounded border border-foreground/20 bg-transparent px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    value={it.fat || ""}
                    onChange={(e) => patchItem(mi, ii, { fat: num(e.target.value) })}
                    placeholder="F"
                    className="w-14 rounded border border-foreground/20 bg-transparent px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setMeals((m) =>
                        m.map((x, i) =>
                          i === mi
                            ? { ...x, items: x.items.filter((_, j) => j !== ii) }
                            : x,
                        ),
                      )
                    }
                    className="rounded-full border border-foreground/20 px-2 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setMeals((m) =>
                    m.map((x, i) =>
                      i === mi ? { ...x, items: [...x.items, emptyItem()] } : x,
                    ),
                  )
                }
                className="text-xs text-foreground/70 underline"
              >
                + {t("addItem")}
              </button>
            </div>
          ))}

          <p className="text-sm text-foreground/70">
            {t("dailyTotals")}: <strong>{totals.kcal} kcal</strong> · P{" "}
            {totals.protein}g · C {totals.carbs}g · F {totals.fat}g
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setMeals((m) => [...m, emptyMeal()])}
              className="rounded-full border border-foreground/20 px-4 py-2 text-sm"
            >
              {t("addMeal")}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending || title.trim() === ""}
              className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
            >
              {t("save")}
            </button>
            {error && <span className="text-sm text-red-600">{t("saveError")}</span>}
          </div>
        </div>
      </details>
    </div>
  );
}
