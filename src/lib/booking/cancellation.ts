// 24-hour cancellation policy. The window is an absolute duration before the
// session start, so it is timezone-independent (instants only). Cancelling
// 24h or more before is free; within 24h the client is charged.

export const CANCELLATION_WINDOW_HOURS = 24;

export type CancellationOutcome = "FREE" | "LATE";

const WINDOW_MS = CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000;

/** Hours remaining until the session starts (can be negative if in the past). */
export function hoursUntilStart(startAt: Date, now: Date = new Date()): number {
  return (startAt.getTime() - now.getTime()) / (60 * 60 * 1000);
}

/**
 * FREE when cancelling at least 24h before the start; otherwise LATE.
 * Exactly 24h before is treated as FREE (boundary inclusive).
 */
export function cancellationOutcome(
  startAt: Date,
  now: Date = new Date(),
): CancellationOutcome {
  return startAt.getTime() - now.getTime() >= WINDOW_MS ? "FREE" : "LATE";
}

/** Whether the appointment can still be cancelled (it hasn't started yet). */
export function isCancellable(startAt: Date, now: Date = new Date()): boolean {
  return startAt.getTime() > now.getTime();
}
