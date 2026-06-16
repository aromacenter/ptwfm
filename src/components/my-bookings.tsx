"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DEFAULT_TIMEZONE } from "@/lib/i18n/format";

const localeTag: Record<string, string> = { en: "en-GB", hu: "hu-HU" };

type Booking = { id: string; start: string };

export function MyBookings({ bookings }: { bookings: Booking[] }) {
  const t = useTranslations("myBookings");
  const locale = useLocale();
  const tag = localeTag[locale] ?? "en-GB";

  const [items, setItems] = useState<Booking[]>(bookings);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "warn"; text: string } | null>(
    null,
  );

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: DEFAULT_TIMEZONE,
      }),
    [tag],
  );

  async function cancel(id: string) {
    if (!window.confirm(t("cancelConfirm"))) return;
    setPending(id);
    setMessage(null);
    const res = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: id }),
    });
    setPending(null);
    if (res.ok) {
      const { outcome } = (await res.json()) as { outcome: "FREE" | "LATE" };
      setItems((prev) => prev.filter((b) => b.id !== id));
      setMessage(
        outcome === "FREE"
          ? { kind: "ok", text: t("freeCancelled") }
          : { kind: "warn", text: t("lateCancelled") },
      );
    }
  }

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        {message && <Banner message={message} />}
        <p className="text-sm text-foreground/60">{t("noBookings")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {message && <Banner message={message} />}
      <ul className="divide-y divide-foreground/10 rounded border border-foreground/15">
        {items.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <span>{fmt.format(new Date(b.start))}</span>
            <button
              type="button"
              onClick={() => cancel(b.id)}
              disabled={pending === b.id}
              className="rounded-full border border-foreground/20 px-3 py-1 disabled:opacity-50"
            >
              {pending === b.id ? t("cancelling") : t("cancel")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Banner({ message }: { message: { kind: "ok" | "warn"; text: string } }) {
  return (
    <p
      role="status"
      className={`text-sm ${
        message.kind === "warn" ? "text-amber-700" : "text-green-700"
      }`}
    >
      {message.text}
    </p>
  );
}
