"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function RequestRespondButton({
  requestId,
  responded,
}: {
  requestId: string;
  responded: boolean;
}) {
  const t = useTranslations("trainerRequests");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (responded) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
        ✓ {t("responded")}
      </span>
    );
  }

  async function markResponded() {
    setPending(true);
    const res = await fetch(`/api/trainer-requests/${requestId}/respond`, {
      method: "POST",
    });
    setPending(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={markResponded}
      disabled={pending}
      className="rounded-full border border-foreground/20 px-3 py-1.5 text-xs disabled:opacity-50"
    >
      {t("markResponded")}
    </button>
  );
}
