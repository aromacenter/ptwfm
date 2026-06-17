"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function CopyField({ value }: { value: string }) {
  const t = useTranslations("availability");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable; the value is still selectable.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded border border-foreground/20 bg-transparent px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm text-background"
      >
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
