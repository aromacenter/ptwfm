"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function TrainerProfileEditor({
  initial,
}: {
  initial: {
    headline: string;
    bio: string;
    acceptingClients: boolean;
    hourlyRatePence: number;
  };
}) {
  const t = useTranslations("trainerProfile");
  const [headline, setHeadline] = useState(initial.headline);
  const [bio, setBio] = useState(initial.bio);
  const [accepting, setAccepting] = useState(initial.acceptingClients);
  const [rate, setRate] = useState((initial.hourlyRatePence / 100).toFixed(2));
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setPending(true);
    setSaved(false);
    const res = await fetch("/api/trainer/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline,
        bio,
        acceptingClients: accepting,
        hourlyRatePence: Math.round(Number(rate) * 100) || 0,
      }),
    });
    setPending(false);
    if (res.ok) setSaved(true);
  }

  return (
    <div className="space-y-3 rounded border border-foreground/15 p-4">
      <div className="space-y-1">
        <h2 className="font-medium">{t("title")}</h2>
        <p className="text-sm text-foreground/70">{t("intro")}</p>
      </div>

      <label className="block space-y-1 text-sm">
        <span>{t("headline")}</span>
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder={t("headlinePlaceholder")}
          maxLength={120}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>{t("bio")}</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t("bioPlaceholder")}
          rows={4}
          maxLength={2000}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>{t("hourlyRate")}</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-40 rounded border border-foreground/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={accepting}
          onChange={(e) => setAccepting(e.target.checked)}
        />
        <span>{t("acceptingClients")}</span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {t("save")}
        </button>
        {saved && (
          <span role="status" className="text-sm text-green-700">
            {t("saved")}
          </span>
        )}
      </div>
    </div>
  );
}
