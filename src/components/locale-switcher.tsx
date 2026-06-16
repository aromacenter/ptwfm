"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useTransition } from "react";

const LABELS: Record<string, string> = {
  en: "English",
  hu: "Magyar",
};

export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{t("language")}</span>
      <select
        aria-label={t("language")}
        value={locale}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(() => {
            router.replace(pathname, { locale: next });
          });
        }}
        className="rounded border border-foreground/20 bg-transparent px-2 py-1"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {LABELS[loc] ?? loc}
          </option>
        ))}
      </select>
    </label>
  );
}
