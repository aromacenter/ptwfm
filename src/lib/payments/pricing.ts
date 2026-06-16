// All money is integer pence (GBP). Pure, side-effect-free pricing helpers.

export const CURRENCY = "gbp";

export type PackageOption = {
  id: string; // e.g. "single", "pack5", "pack12"
  sessions: number;
  discountPct: number; // applied to the per-session rate for multi-session packs
};

// Platform package catalogue. Single = no discount; bigger packs are cheaper.
export const PACKAGE_OPTIONS: readonly PackageOption[] = [
  { id: "single", sessions: 1, discountPct: 0 },
  { id: "pack5", sessions: 5, discountPct: 5 },
  { id: "pack12", sessions: 12, discountPct: 10 },
];

export function getPackageOption(id: string): PackageOption | undefined {
  return PACKAGE_OPTIONS.find((p) => p.id === id);
}

/**
 * Total price (pence) for a package, given the trainer's hourly rate.
 * Rounds to the nearest penny.
 */
export function computePackagePrice(
  hourlyRatePence: number,
  sessions: number,
  discountPct: number,
): number {
  if (hourlyRatePence < 0 || sessions <= 0) {
    throw new Error("invalid package inputs");
  }
  const gross = hourlyRatePence * sessions;
  const discounted = gross * (1 - discountPct / 100);
  return Math.round(discounted);
}

export function priceForPackage(
  hourlyRatePence: number,
  option: PackageOption,
): number {
  return computePackagePrice(
    hourlyRatePence,
    option.sessions,
    option.discountPct,
  );
}

// A minimal credit shape for selection.
export type ConsumableCredit = {
  id: string;
  usedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
};

/**
 * Picks the credit to consume for a new booking: the unused, unexpired credit
 * that expires soonest (oldest createdAt as a tiebreak). Returns null if none.
 */
export function pickConsumableCredit(
  credits: readonly ConsumableCredit[],
  now: Date = new Date(),
): ConsumableCredit | null {
  const usable = credits.filter(
    (c) => c.usedAt === null && (c.expiresAt === null || c.expiresAt > now),
  );
  if (usable.length === 0) return null;

  return [...usable].sort((a, b) => {
    const ax = a.expiresAt ? a.expiresAt.getTime() : Infinity;
    const bx = b.expiresAt ? b.expiresAt.getTime() : Infinity;
    if (ax !== bx) return ax - bx;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0];
}
