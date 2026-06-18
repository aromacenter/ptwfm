"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function ClientActions({
  clientId,
  mode,
}: {
  clientId: string;
  mode: "pending" | "active";
}) {
  const t = useTranslations("clients");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function call(action: "dedicate" | "release") {
    if (action === "release" && !window.confirm(t("releaseConfirm"))) return;
    setPending(true);
    const res = await fetch(`/api/clients/${clientId}/${action}`, {
      method: "POST",
    });
    setPending(false);
    if (res.ok) router.refresh();
  }

  if (mode === "pending") {
    return (
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => call("dedicate")}
          className="rounded-full bg-foreground px-3 py-2 text-sm text-background disabled:opacity-50"
        >
          {t("dedicate")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => call("release")}
          className="rounded-full border border-foreground/20 px-3 py-2 text-sm disabled:opacity-50"
        >
          {t("decline")}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => call("release")}
      className="shrink-0 rounded-full border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
    >
      {t("release")}
    </button>
  );
}
