"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Option = { id: string; priceLabel: string };

export function BillingClient({ options }: { options: Option[] }) {
  const t = useTranslations("billing");
  const [pending, setPending] = useState<string | null>(null);

  async function buy(packageId: string) {
    setPending(packageId);
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId }),
    });
    if (res.ok) {
      const { url } = (await res.json()) as { url: string | null };
      if (url) {
        window.location.assign(url); // Stripe-hosted checkout
        return;
      }
    }
    setPending(null);
  }

  return (
    <ul className="divide-y divide-foreground/10 rounded border border-foreground/15">
      {options.map((opt) => (
        <li
          key={opt.id}
          className="flex items-center justify-between px-4 py-3 text-sm"
        >
          <span>
            {t(opt.id)} — <strong>{opt.priceLabel}</strong>
          </span>
          <button
            type="button"
            onClick={() => buy(opt.id)}
            disabled={pending !== null}
            className="rounded-full bg-foreground px-4 py-2 text-background disabled:opacity-50"
          >
            {pending === opt.id ? t("redirecting") : t("buy")}
          </button>
        </li>
      ))}
    </ul>
  );
}
