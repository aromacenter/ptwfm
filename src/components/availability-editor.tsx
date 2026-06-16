"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Rule = {
  id: string;
  dayOfWeek: number;
  startHour: number;
  endHour: number;
};

const HOURS = Array.from({ length: 25 }, (_, i) => i); // 0..24

export function AvailabilityEditor({ initialRules }: { initialRules: Rule[] }) {
  const t = useTranslations("availability");
  const tw = useTranslations("weekdays");
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [day, setDay] = useState(1);
  const [from, setFrom] = useState(9);
  const [to, setTo] = useState(17);
  const [pending, setPending] = useState(false);

  async function add() {
    setPending(true);
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek: day, startHour: from, endHour: to }),
    });
    setPending(false);
    if (res.ok) {
      const { rule } = (await res.json()) as { rule: Rule };
      setRules((prev) =>
        [...prev, rule].sort(
          (a, b) => a.dayOfWeek - b.dayOfWeek || a.startHour - b.startHour,
        ),
      );
    }
  }

  async function remove(id: string) {
    setPending(true);
    const res = await fetch(`/api/availability?id=${id}`, { method: "DELETE" });
    setPending(false);
    if (res.ok) setRules((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded border border-foreground/15 p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("day")}</span>
          <select
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="rounded border border-foreground/20 bg-transparent px-2 py-1"
          >
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <option key={d} value={d}>
                {tw(String(d))}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("from")}</span>
          <select
            value={from}
            onChange={(e) => setFrom(Number(e.target.value))}
            className="rounded border border-foreground/20 bg-transparent px-2 py-1"
          >
            {HOURS.slice(0, 24).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("to")}</span>
          <select
            value={to}
            onChange={(e) => setTo(Number(e.target.value))}
            className="rounded border border-foreground/20 bg-transparent px-2 py-1"
          >
            {HOURS.slice(1).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={add}
          disabled={pending || from >= to}
          className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {t("add")}
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-foreground/60">{t("noRules")}</p>
      ) : (
        <ul className="divide-y divide-foreground/10 rounded border border-foreground/15">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>
                <strong>{tw(String(r.dayOfWeek))}</strong>{" "}
                {String(r.startHour).padStart(2, "0")}:00–
                {String(r.endHour).padStart(2, "0")}:00
              </span>
              <button
                type="button"
                onClick={() => remove(r.id)}
                disabled={pending}
                className="rounded-full border border-foreground/20 px-3 py-1 disabled:opacity-50"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
