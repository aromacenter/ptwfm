"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { DEFAULT_TIMEZONE } from "@/lib/i18n/format";

const localeTag: Record<string, string> = { en: "en-GB", hu: "hu-HU" };

const DAYS_SHOWN = 14;

export function BookingPicker({
  trainerId,
  slots,
  canBook,
  signedIn,
  kind = "SESSION",
}: {
  trainerId: string;
  slots: string[]; // ISO start instants
  canBook: boolean;
  signedIn: boolean;
  kind?: "SESSION" | "CONSULTATION";
}) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const router = useRouter();
  const tag = localeTag[locale] ?? "en-GB";

  const [available, setAvailable] = useState<string[]>(slots);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  // Formatters (Europe/London).
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
  const monthLabelFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    [tag],
  );
  const weekdayShortFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, { weekday: "short", timeZone: "UTC" }),
    [tag],
  );

  // Slots grouped by Europe/London calendar day.
  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const iso of available) {
      const key = dayKeyFmt.format(new Date(iso));
      const list = m.get(key) ?? [];
      list.push(iso);
      m.set(key, list);
    }
    for (const list of m.values()) list.sort();
    return m;
  }, [available, dayKeyFmt]);

  // 14-day window starting today.
  const todayKey = dayKeyFmt.format(new Date());
  const dayKeys = useMemo(() => {
    const base = new Date(`${todayKey}T12:00:00Z`);
    return Array.from({ length: DAYS_SHOWN }, (_, i) => {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [todayKey]);

  const firstAvailable = dayKeys.find((k) => byDay.has(k)) ?? null;
  const [selected, setSelected] = useState<string | null>(firstAvailable);
  const selectedKey = selected && byDay.has(selected) ? selected : firstAvailable;

  // Monday-first weekday headers.
  const weekdayHeaders = useMemo(() => {
    const ref = new Date("2024-01-01T12:00:00Z"); // a Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ref);
      d.setUTCDate(ref.getUTCDate() + i);
      return weekdayShortFmt.format(d);
    });
  }, [weekdayShortFmt]);

  // Leading blanks so the first day lands under the right weekday column.
  const leadingBlanks = useMemo(() => {
    if (dayKeys.length === 0) return 0;
    const dow = new Date(`${dayKeys[0]}T12:00:00Z`).getUTCDay(); // 0=Sun
    return (dow + 6) % 7; // Monday-first
  }, [dayKeys]);

  const monthLabel = monthLabelFmt.format(new Date(`${dayKeys[0]}T12:00:00Z`));

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
      setAvailable((prev) => prev.filter((s) => s !== iso));
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
      setAvailable((prev) => prev.filter((s) => s !== iso));
      setMessage({ kind: "error", text: t("slotTaken") });
    }
  }

  if (available.length === 0) {
    return (
      <div className="space-y-3">
        {message && <Banner message={message} />}
        <p className="text-sm text-foreground/60">{t("noSlots")}</p>
      </div>
    );
  }

  const selectedSlots = selectedKey ? (byDay.get(selectedKey) ?? []) : [];

  return (
    <div className="space-y-4">
      {message && <Banner message={message} />}
      {!signedIn && (
        <p className="text-sm text-foreground/70">{t("signInToBook")}</p>
      )}

      <div className="rounded-xl border border-foreground/10 p-3">
        <p className="px-1 pb-2 text-sm font-medium capitalize">{monthLabel}</p>

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
            const has = byDay.has(key);
            const dayNum = Number(key.slice(8, 10));
            const isSelected = key === selectedKey;
            return (
              <button
                key={key}
                type="button"
                disabled={!has}
                onClick={() => setSelected(key)}
                className={[
                  "flex aspect-square flex-col items-center justify-center rounded-lg text-sm",
                  has
                    ? "cursor-pointer hover:bg-foreground/10"
                    : "text-foreground/25",
                  isSelected ? "bg-foreground text-background" : "",
                ].join(" ")}
              >
                <span>{dayNum}</span>
                {has && !isSelected && (
                  <span className="mt-0.5 h-1 w-1 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedKey && (
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

function Banner({
  message,
}: {
  message: { kind: "ok" | "error"; text: string };
}) {
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
