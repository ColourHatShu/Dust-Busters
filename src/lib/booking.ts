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

export const DEFAULT_BOOKING_LEAD_MINUTES = 15;

export type BookingValidation =
  | { ok: true; scheduledISO: string }
  | { ok: false; error: string };

/**
 * Authoritative server-side validation of a booking request (pure).
 * Date is parsed from the `datetime-local` string; `now` and the area whitelist
 * are passed in so this is fully testable.
 */
export function validateBooking(input: {
  scheduledLocal: string;
  hours: number;
  area: string;
  fullAddress: string;
  nowMs: number;
  areas: readonly string[];
  leadMinutes?: number;
}): BookingValidation {
  const lead = input.leadMinutes ?? DEFAULT_BOOKING_LEAD_MINUTES;
  const scheduled = new Date(input.scheduledLocal);
  const t = scheduled.getTime();

  if (Number.isNaN(t)) {
    return { ok: false, error: "Please choose a valid date and time." };
  }
  if (t < input.nowMs + lead * 60_000) {
    return {
      ok: false,
      error: `Please choose a date and time at least ${lead} minutes from now.`,
    };
  }
  if (!Number.isInteger(input.hours) || input.hours < 1 || input.hours > 12) {
    return { ok: false, error: "Hours must be a whole number between 1 and 12." };
  }
  if (!input.areas.includes(input.area)) {
    return { ok: false, error: "Please choose a valid service area." };
  }
  if (input.fullAddress.trim().length < 5) {
    return { ok: false, error: "Please enter your full address." };
  }

  return { ok: true, scheduledISO: scheduled.toISOString() };
}
