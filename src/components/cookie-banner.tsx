"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const COOKIE_NAME = "cookie-consent";

function setConsent(value: "all" | "essential") {
  // 1 year, lax. PECR: non-essential cookies only after explicit "all".
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=31536000; SameSite=Lax`;
}

export function CookieBanner() {
  const t = useTranslations("cookies");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Sync with the cookie set in the browser (an external system): show the
    // banner only when no choice has been stored yet.
    const set = document.cookie
      .split("; ")
      .some((c) => c.startsWith(`${COOKIE_NAME}=`));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!set) setVisible(true);
  }, []);

  if (!visible) return null;

  function choose(value: "all" | "essential") {
    setConsent(value);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-foreground/15 bg-background p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground/80">{t("message")}</p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("essential")}
            className="rounded-full border border-foreground/20 px-4 py-2 text-sm"
          >
            {t("essentialOnly")}
          </button>
          <button
            type="button"
            onClick={() => choose("all")}
            className="rounded-full bg-foreground px-4 py-2 text-sm text-background"
          >
            {t("acceptAll")}
          </button>
        </div>
      </div>
    </div>
  );
}
