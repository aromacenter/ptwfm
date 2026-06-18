"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

type ConsentKey = "HEALTH_DATA" | "MARKETING";

export function PrivacyControls({
  initial,
}: {
  initial: { health: boolean; marketing: boolean };
}) {
  const t = useTranslations("privacy");
  const [health, setHealth] = useState(initial.health);
  const [marketing, setMarketing] = useState(initial.marketing);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function toggle(type: ConsentKey, next: boolean) {
    setPending(true);
    setStatus(null);
    const res = await fetch("/api/gdpr/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, granted: next }),
    });
    setPending(false);
    if (res.ok) {
      if (type === "HEALTH_DATA") setHealth(next);
      if (type === "MARKETING") setMarketing(next);
      setStatus(t("updated"));
    }
  }

  async function requestErasure() {
    if (!window.confirm(t("erasureConfirm"))) return;
    setPending(true);
    const res = await fetch("/api/gdpr/erasure", { method: "POST" });
    setPending(false);
    if (res.ok) {
      window.alert(t("erasureDone"));
      void signOut({ callbackUrl: "/" });
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-medium">{t("consents")}</h2>

        <ConsentRow
          label={t("healthData")}
          description={t("healthDataDesc")}
          granted={health}
          grantedLabel={t("granted")}
          withdrawnLabel={t("withdrawn")}
          grantLabel={t("grant")}
          withdrawLabel={t("withdraw")}
          disabled={pending}
          onChange={(next) => toggle("HEALTH_DATA", next)}
        />
        <ConsentRow
          label={t("marketing")}
          description={t("marketingDesc")}
          granted={marketing}
          grantedLabel={t("granted")}
          withdrawnLabel={t("withdrawn")}
          grantLabel={t("grant")}
          withdrawLabel={t("withdraw")}
          disabled={pending}
          onChange={(next) => toggle("MARKETING", next)}
        />

        {status && (
          <p role="status" className="text-sm text-green-700">
            {status}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">{t("yourRights")}</h2>

        <div className="rounded border border-foreground/15 p-4">
          <h3 className="font-medium">{t("exportTitle")}</h3>
          <p className="mt-1 text-sm text-foreground/70">{t("exportDesc")}</p>
          <button
            type="button"
            onClick={async () => {
              // POST (the export writes an audit entry); download the blob.
              const res = await fetch("/api/gdpr/export", { method: "POST" });
              if (!res.ok) return;
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "pt-management-data-export.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="mt-3 inline-block rounded-full border border-foreground/20 px-4 py-2 text-sm"
          >
            {t("exportButton")}
          </button>
        </div>

        <div className="rounded border border-red-300 p-4">
          <h3 className="font-medium text-red-700">{t("erasureTitle")}</h3>
          <p className="mt-1 text-sm text-foreground/70">{t("erasureDesc")}</p>
          <button
            type="button"
            onClick={requestErasure}
            disabled={pending}
            className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {t("erasureButton")}
          </button>
        </div>
      </section>
    </div>
  );
}

function ConsentRow({
  label,
  description,
  granted,
  grantedLabel,
  withdrawnLabel,
  grantLabel,
  withdrawLabel,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  granted: boolean;
  grantedLabel: string;
  withdrawnLabel: string;
  grantLabel: string;
  withdrawLabel: string;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded border border-foreground/15 p-4">
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-foreground/70">{description}</p>
        <p className="mt-1 text-xs text-foreground/60">
          {granted ? grantedLabel : withdrawnLabel}
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!granted)}
        className="shrink-0 rounded-full border border-foreground/20 px-4 py-2 text-sm disabled:opacity-50"
      >
        {granted ? withdrawLabel : grantLabel}
      </button>
    </div>
  );
}
