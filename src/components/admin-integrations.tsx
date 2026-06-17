"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Status = {
  key: string;
  secret: boolean;
  source: "db" | "env" | "none";
  value: string | null;
};

export function AdminIntegrations({ initial }: { initial: Status[] }) {
  const t = useTranslations("admin");
  const [items, setItems] = useState<Status[]>(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function save(key: string, value: string) {
    setPending(key);
    setSaved(null);
    const res = await fetch("/api/admin/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setPending(null);
    if (!res.ok) return;
    setSaved(key);
    setDrafts((d) => ({ ...d, [key]: "" }));
    setItems((prev) =>
      prev.map((it) =>
        it.key === key
          ? {
              ...it,
              source: value === "" ? "none" : "db",
              value: it.secret ? null : value === "" ? null : value,
            }
          : it,
      ),
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((it) => {
        const label = t(`labels.${it.key}` as never);
        const configured = it.source !== "none";
        const sourceLabel =
          it.source === "db"
            ? t("sourceDb")
            : it.source === "env"
              ? t("sourceEnv")
              : "";
        return (
          <li
            key={it.key}
            className="space-y-2 rounded border border-foreground/15 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{label}</span>
              <span
                className={`text-xs ${configured ? "text-green-700" : "text-foreground/50"}`}
              >
                {configured
                  ? `${t("configured")} (${sourceLabel})`
                  : t("notConfigured")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type={it.secret ? "password" : "text"}
                value={
                  it.secret
                    ? (drafts[it.key] ?? "")
                    : (drafts[it.key] ?? it.value ?? "")
                }
                placeholder={it.secret ? t("secretPlaceholder") : ""}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [it.key]: e.target.value }))
                }
                autoComplete="off"
                className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={pending === it.key}
                onClick={() => save(it.key, drafts[it.key] ?? it.value ?? "")}
                className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
              >
                {t("save")}
              </button>
              {configured && (
                <button
                  type="button"
                  disabled={pending === it.key}
                  onClick={() => save(it.key, "")}
                  className="shrink-0 rounded-full border border-foreground/20 px-3 py-2 text-sm disabled:opacity-50"
                >
                  {t("clear")}
                </button>
              )}
            </div>

            {saved === it.key && (
              <p role="status" className="text-xs text-green-700">
                {t("saved")}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
