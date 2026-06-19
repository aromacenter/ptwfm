// Pure helpers for trainer review aggregation. Kept framework-free so they're
// trivially unit-testable.

export type RatingSummary = {
  /** Average rating rounded to one decimal, or null when there are none. */
  average: number | null;
  /** Number of reviews. */
  count: number;
};

/** Aggregate a list of 1..5 ratings into an average (1 d.p.) + count. */
export function summariseRatings(ratings: number[]): RatingSummary {
  if (ratings.length === 0) return { average: null, count: 0 };
  const sum = ratings.reduce((a, b) => a + b, 0);
  const average = Math.round((sum / ratings.length) * 10) / 10;
  return { average, count: ratings.length };
}

/** Clamp an arbitrary value to a valid 1..5 integer star rating, or null. */
export function normaliseRating(value: unknown): number | null {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return n;
}
