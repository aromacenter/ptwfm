"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function AppointmentActions({ id }: { id: string }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function set(status: "COMPLETED" | "NO_SHOW") {
    setPending(true);
    const res = await fetch(`/api/appointments/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPending(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => set("COMPLETED")}
        className="rounded-full bg-foreground px-3 py-2 text-sm text-background disabled:opacity-50"
      >
        {t("completed")}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => set("NO_SHOW")}
        className="rounded-full border border-foreground/20 px-3 py-2 text-sm disabled:opacity-50"
      >
        {t("noShow")}
      </button>
    </div>
  );
}
