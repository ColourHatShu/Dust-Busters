// Pure booking helpers (no I/O) so the critical money/validation logic is unit-
// testable. Used by the booking + cancellation server actions.

/** Customers may cancel free up to this many hours before the appointment. */
export const FREE_CANCEL_HOURS = 24;

/** Hours from `nowMs` until the appointment at `scheduledAtMs`. */
export function hoursUntil(scheduledAtMs: number, nowMs: number): number {
  return (scheduledAtMs - nowMs) / 3_600_000;
}

/**
 * Whether a paid deposit is refundable on cancellation: true only when the
 * appointment is at least `windowHours` away.
 */
export function isDepositRefundable(
  scheduledAtMs: number,
  nowMs: number,
  windowHours: number = FREE_CANCEL_HOURS,
): boolean {
  return hoursUntil(scheduledAtMs, nowMs) >= windowHours;
}
