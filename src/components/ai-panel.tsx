"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function AiPanel({
  endpoint,
  body,
  title,
  generateLabel,
}: {
  endpoint: string;
  body?: Record<string, unknown>;
  title: string;
  generateLabel: string;
}) {
  const t = useTranslations("ai");
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function generate() {
    setPending(true);
    setError(null);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    setPending(false);
    if (res.ok) {
      setContent((await res.json()).content as string);
    } else {
      setError(t("unavailable"));
    }
  }

  return (
    <div className="space-y-3 rounded border border-foreground/15 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">{title}</h3>
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {pending ? t("generating") : generateLabel}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {content && (
        <div className="space-y-2">
          <p className="whitespace-pre-wrap text-sm text-foreground/90">
            {content}
          </p>
          <p className="text-xs text-foreground/50">{t("disclaimer")}</p>
        </div>
      )}
    </div>
  );
}
