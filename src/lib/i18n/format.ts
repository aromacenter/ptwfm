// Locale-aware formatting helpers. Money is stored in pence (integer GBP).

export const DEFAULT_TIMEZONE = "Europe/London";
export const DEFAULT_CURRENCY = "GBP";

const localeTag: Record<string, string> = {
  en: "en-GB",
  hu: "hu-HU",
};

function tag(locale: string): string {
  return localeTag[locale] ?? "en-GB";
}

/** Format an integer amount of pence as a localized GBP currency string. */
export function formatMoney(pence: number, locale = "en"): string {
  return new Intl.NumberFormat(tag(locale), {
    style: "currency",
    currency: DEFAULT_CURRENCY,
  }).format(pence / 100);
}

/** Format a date/time in the trainer's timezone (Europe/London by default). */
export function formatDateTime(
  date: Date,
  locale = "en",
  timeZone = DEFAULT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat(tag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date);
}
