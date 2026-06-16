"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Scope = "DAY" | "WEEK" | "MONTH";
type Plan = { id: string; title: string; scope: Scope; items: string[] };

const SCOPE_DAYS: Record<Scope, number> = { DAY: 1, WEEK: 7, MONTH: 30 };

export function ClientPlans({
  clientId,
  initialPlans,
}: {
  clientId: string;
  initialPlans: Plan[];
}) {
  const t = useTranslations("clients");
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<Scope>("WEEK");
  const [itemsText, setItemsText] = useState("");
  const [pending, setPending] = useState(false);

  async function create() {
    if (title.trim() === "") return;
    setPending(true);
    const start = new Date();
    const end = new Date(start.getTime() + SCOPE_DAYS[scope] * 24 * 60 * 60 * 1000);
    const items = itemsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch(`/api/clients/${clientId}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        title: title.trim(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        items,
      }),
    });
    setPending(false);
    if (res.ok) {
      const { plan } = (await res.json()) as {
        plan: { id: string; title: string; scope: Scope; items: { content: string }[] };
      };
      setPlans((prev) => [
        { id: plan.id, title: plan.title, scope: plan.scope, items: plan.items.map((i) => i.content) },
        ...prev,
      ]);
      setTitle("");
      setItemsText("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded border border-foreground/15 p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("planTitlePlaceholder")}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <span>{t("scope")}</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as Scope)}
            className="rounded border border-foreground/20 bg-transparent px-2 py-1"
          >
            <option value="DAY">{t("scopeDay")}</option>
            <option value="WEEK">{t("scopeWeek")}</option>
            <option value="MONTH">{t("scopeMonth")}</option>
          </select>
        </label>
        <textarea
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
          placeholder={t("itemsPlaceholder")}
          rows={4}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={create}
          disabled={pending || title.trim() === ""}
          className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {t("addPlan")}
        </button>
      </div>

      {plans.length === 0 ? (
        <p className="text-sm text-foreground/60">{t("noPlans")}</p>
      ) : (
        <ul className="space-y-3">
          {plans.map((p) => (
            <li key={p.id} className="rounded border border-foreground/15 p-4">
              <p className="text-sm font-medium">
                {p.title}{" "}
                <span className="text-xs text-foreground/60">
                  ({t(`scope${p.scope[0]}${p.scope.slice(1).toLowerCase()}`)})
                </span>
              </p>
              {p.items.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm text-foreground/80">
                  {p.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
