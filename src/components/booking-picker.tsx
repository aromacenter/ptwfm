"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { DEFAULT_TIMEZONE } from "@/lib/i18n/format";

const localeTag: Record<string, string> = { en: "en-GB", hu: "hu-HU" };
const pad = (n: number) => String(n).padStart(2, "0");

export function BookingPicker({
  trainerId,
  canBook,
  signedIn,
  kind = "SESSION",
}: {
  trainerId: string;
  canBook: boolean;
  signedIn: boolean;
  kind?: "SESSION" | "CONSULTATION";
}) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const tag = localeTag[locale] ?? "en-GB";

  // Current month in Europe/London.
  const todayKey = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: DEFAULT_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    [],
  );
  const [curY, curM] = [Number(todayKey.slice(0, 4)), Number(todayKey.slice(5, 7))];

  const [view, setView] = useState({ year: curY, month: curM }); // month 1-12
  const [byDay, setByDay] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );

  const dayKeyFmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: DEFAULT_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [],
  );
  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: DEFAULT_TIMEZONE,
      }),
    [tag],
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(view.year, view.month - 1, 1))),
    [tag, view],
  );

  const weekdayHeaders = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(tag, { weekday: "short", timeZone: "UTC" });
    const ref = new Date("2024-01-01T12:00:00Z"); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ref);
      d.setUTCDate(ref.getUTCDate() + i);
      return fmt.format(d);
    });
  }, [tag]);

  // Fetch the displayed month's available slots (pad by a day for tz edges).
  const loadMonth = useCallback(async () => {
    setLoading(true);
    const from = new Date(Date.UTC(view.year, view.month - 1, 1) - 86_400_000);
    const to = new Date(Date.UTC(view.year, view.month, 1) + 86_400_000);
    const res = await fetch(
      `/api/availability/slots?trainerId=${trainerId}&from=${from.toISOString()}&to=${to.toISOString()}`,
    );
    const data = (await res.json().catch(() => null)) as
      | { slots: { start: string }[] }
      | null;
    const m = new Map<string, string[]>();
    for (const s of data?.slots ?? []) {
      const key = dayKeyFmt.format(new Date(s.start));
      const list = m.get(key) ?? [];
      list.push(s.start);
      m.set(key, list);
    }
    for (const list of m.values()) list.sort();
    setByDay(m);
    setLoading(false);
  }, [trainerId, view, dayKeyFmt]);

  useEffect(() => {
    // Load the displayed month's slots (fetch-on-mount / on month change).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMonth();
  }, [loadMonth]);

  const daysInMonth = new Date(Date.UTC(view.year, view.month, 0)).getUTCDate();
  const leadingBlanks =
    (new Date(Date.UTC(view.year, view.month - 1, 1)).getUTCDay() + 6) % 7;
  const dayKeys = Array.from(
    { length: daysInMonth },
    (_, i) => `${view.year}-${pad(view.month)}-${pad(i + 1)}`,
  );

  const isCurrentMonth = view.year === curY && view.month === curM;
  function shift(delta: number) {
    setSelected(null);
    setView((v) => {
      const idx = v.year * 12 + (v.month - 1) + delta;
      return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
    });
  }

  async function book(iso: string) {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setPending(iso);
    setMessage(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainerId, start: iso, kind }),
    });
    setPending(null);
    if (res.ok) {
      setByDay((prev) => {
        const m = new Map(prev);
        for (const [k, list] of m) m.set(k, list.filter((s) => s !== iso));
        return m;
      });
      setMessage({
        kind: "ok",
        text: kind === "CONSULTATION" ? t("consultationConfirmed") : t("confirmed"),
      });
      return;
    }
    const err = ((await res.json().catch(() => null)) as { error?: string } | null)
      ?.error;
    if (err === "already_dedicated") {
      setMessage({ kind: "error", text: t("alreadyDedicated") });
    } else if (err === "not_dedicated") {
      setMessage({ kind: "error", text: t("notDedicated") });
    } else {
      setMessage({ kind: "error", text: t("slotTaken") });
      void loadMonth();
    }
  }

  const selectedSlots = selected ? (byDay.get(selected) ?? []) : [];

  return (
    <div className="space-y-4">
      {message && <Banner message={message} />}
      {!signedIn && <p className="text-sm text-foreground/70">{t("signInToBook")}</p>}

      <div className="rounded-xl border border-foreground/10 p-3">
        <div className="flex items-center justify-between px-1 pb-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            disabled={isCurrentMonth}
            aria-label={t("prevMonth")}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-foreground/10 disabled:opacity-30"
          >
            ‹
          </button>
          <span className="text-sm font-medium capitalize">{monthLabel}</span>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label={t("nextMonth")}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-foreground/10"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdayHeaders.map((w, i) => (
            <div key={i} className="py-1 text-xs text-foreground/50">
              {w}
            </div>
          ))}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`b${i}`} />
          ))}
          {dayKeys.map((key) => {
            const has = byDay.has(key) && (byDay.get(key)?.length ?? 0) > 0;
            const isSelected = key === selected;
            return (
              <button
                key={key}
                type="button"
                disabled={!has}
                onClick={() => setSelected(key)}
                className={[
                  "flex aspect-square flex-col items-center justify-center rounded-lg text-sm",
                  has ? "cursor-pointer hover:bg-foreground/10" : "text-foreground/25",
                  isSelected ? "bg-foreground text-background" : "",
                ].join(" ")}
              >
                <span>{Number(key.slice(8, 10))}</span>
                {has && !isSelected && (
                  <span className="mt-0.5 h-1 w-1 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
        {loading && (
          <p className="px-1 pt-2 text-xs text-foreground/50">{tc("loading")}</p>
        )}
      </div>

      {selected && selectedSlots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSlots.map((iso) => (
            <button
              key={iso}
              type="button"
              disabled={!canBook || pending === iso}
              onClick={() => book(iso)}
              className="rounded-full border border-foreground/20 px-4 py-2 text-sm hover:border-foreground/40 disabled:opacity-50"
            >
              {pending === iso ? t("booking") : timeFmt.format(new Date(iso))}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Banner({ message }: { message: { kind: "ok" | "error"; text: string } }) {
  return (
    <p
      role={message.kind === "error" ? "alert" : "status"}
      className={`text-sm ${
        message.kind === "error" ? "text-red-600" : "text-green-700"
      }`}
    >
      {message.text}
    </p>
  );
}
