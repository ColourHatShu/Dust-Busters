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

/** The business operates in the Comox Valley — bookings are Pacific wall-time. */
export const BOOKING_TIMEZONE = "America/Vancouver";

/** True if a datetime string already carries a timezone (…Z or ±hh:mm). */
function hasTimezone(s: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(s);
}

/** Offset (ms) of `timeZone` from UTC at the given UTC instant (DST-aware). */
function tzOffsetMs(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const m: Record<string, number> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) {
    if (p.type !== "literal") m[p.type] = Number(p.value);
  }
  const asIfUTC = Date.UTC(m.year, m.month - 1, m.day, m.hour % 24, m.minute, m.second);
  return asIfUTC - utcMs;
}

/**
 * Parse a booking datetime. A `<input type="datetime-local">` value
 * ("2026-06-30T14:00") has NO timezone, so `new Date(...)` would interpret it in
 * the *server's* zone (UTC on Vercel) — silently shifting a 2pm Pacific booking
 * to 7am Pacific. Interpret bare local values as wall-clock time in the business
 * timezone (DST-aware); strings that already carry a timezone are absolute.
 */
export function parseBookingDate(
  local: string,
  timeZone: string = BOOKING_TIMEZONE,
): Date {
  const s = local.trim();
  if (hasTimezone(s)) return new Date(s);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return new Date(NaN);
  const [, y, mo, d, h, mi, se] = m;
  const guess = Date.UTC(+y, +mo - 1, +d, +h, +mi, se ? +se : 0);
  // Subtract the zone offset to get the true UTC instant; re-check once so the
  // rare wall-time that lands on a DST transition resolves to the right side.
  const utc = guess - tzOffsetMs(guess - tzOffsetMs(guess, timeZone), timeZone);
  return new Date(utc);
}

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
  const scheduled = parseBookingDate(input.scheduledLocal);
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
