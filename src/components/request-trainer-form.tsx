"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function RequestTrainerForm() {
  const t = useTranslations("requestTrainer");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState("");
  const [city, setCity] = useState("");
  const [online, setOnline] = useState(false);
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return;
    setPending(true);
    setError(false);
    const res = await fetch("/api/trainer-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, goal, city, online, consent }),
    });
    setPending(false);
    if (res.ok) setDone(true);
    else setError(true);
  }

  if (done) {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-sm text-emerald-800"
      >
        {t("thanks")}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1 text-sm">
        <span>{t("name")}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>{t("email")}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={200}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>{t("goal")}</span>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={t("goalPlaceholder")}
          required
          rows={4}
          maxLength={2000}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>{t("city")}</span>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t("cityPlaceholder")}
          maxLength={100}
          className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={online}
          onChange={(e) => setOnline(e.target.checked)}
        />
        <span>{t("online")}</span>
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
          className="mt-1"
        />
        <span>{t("consent")}</span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !consent}
          className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {t("submit")}
        </button>
        {error && (
          <span role="alert" className="text-sm text-red-600">
            {t("error")}
          </span>
        )}
      </div>
    </form>
  );
}
