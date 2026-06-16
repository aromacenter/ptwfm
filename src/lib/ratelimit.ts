// Lightweight in-memory sliding-window rate limiter. Adequate for protecting
// expensive endpoints (e.g. AI) within a single instance; replace with a
// shared store (Redis) if running multiple instances (noted for M8).

const hits = new Map<string, number[]>();

/**
 * Returns true if the action for `key` is allowed under `max` requests per
 * `windowMs`. Records the hit when allowed. `now` is injectable for tests.
 */
export function allowRequest(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const cutoff = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/** Test helper: clear all recorded hits. */
export function resetRateLimits() {
  hits.clear();
}
