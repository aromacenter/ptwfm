"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { DEFAULT_TIMEZONE } from "@/lib/i18n/format";

const localeTag: Record<string, string> = { en: "en-GB", hu: "hu-HU" };

export function BookingPicker({
  trainerId,
  slots,
  canBook,
  signedIn,
}: {
  trainerId: string;
  slots: string[]; // ISO start instants
  canBook: boolean;
  signedIn: boolean;
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

  const dayFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: DEFAULT_TIMEZONE,
      }),
    [tag],
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

  // Group slots by calendar day (Europe/London).
  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const iso of available) {
      const label = dayFmt.format(new Date(iso));
      const list = map.get(label) ?? [];
      list.push(iso);
      map.set(label, list);
    }
    return [...map.entries()];
  }, [available, dayFmt]);

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
      body: JSON.stringify({ trainerId, start: iso }),
    });
    setPending(null);

    if (res.ok) {
      setAvailable((prev) => prev.filter((s) => s !== iso));
      setMessage({ kind: "ok", text: t("confirmed") });
      return;
    }
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (data?.error === "bound_to_other_trainer") {
      setMessage({ kind: "error", text: t("boundToOther") });
    } else if (data?.error === "slot_taken" || data?.error === "slot_unavailable") {
      setAvailable((prev) => prev.filter((s) => s !== iso));
      setMessage({ kind: "error", text: t("slotTaken") });
    } else {
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

  return (
    <div className="space-y-6">
      {message && <Banner message={message} />}
      {!signedIn && (
        <p className="text-sm text-foreground/70">{t("signInToBook")}</p>
      )}
      {grouped.map(([day, daySlots]) => (
        <section key={day} className="space-y-2">
          <h2 className="text-sm font-medium text-foreground/80">{day}</h2>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((iso) => (
              <button
                key={iso}
                type="button"
                disabled={!canBook || pending === iso}
                onClick={() => book(iso)}
                className="rounded-full border border-foreground/20 px-4 py-2 text-sm disabled:opacity-50"
              >
                {pending === iso
                  ? t("booking")
                  : timeFmt.format(new Date(iso))}
              </button>
            ))}
          </div>
        </section>
      ))}
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
