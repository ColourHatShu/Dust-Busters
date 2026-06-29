// Single source of truth for booking-status presentation across the app.
//
// Pages used to each declare their own STATUS_LABEL / STATUS_COLOR maps with
// slightly different short labels and (worse) different pastel colors, which is
// the main reason status badges looked inconsistent page-to-page. Import these
// helpers instead. The classes returned are the design-system badge tones
// defined in globals.css (.badge + .badge-<tone>), so every status pill matches.

import type { BookingStatus } from "./types";

type Tone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent"
  | "purple";

// Short, scannable labels for badges in lists/tables/headers. (The long,
// sentence-style copy in types.ts STATUS_LABEL is still used for the booking
// detail status line — these are the compact pill versions.)
export const BOOKING_STATUS_SHORT: Record<BookingStatus, string> = {
  broadcasting: "Finding cleaner",
  accepted: "Awaiting deposit",
  deposit_paid: "Confirmed",
  in_progress: "In progress",
  completed: "Awaiting payment",
  disputed: "Disputed",
  balance_paid: "Paid in full",
  closed: "Closed",
  cancelled: "Cancelled",
  no_cleaner_found: "No cleaner found",
};

const BOOKING_STATUS_TONE: Record<BookingStatus, Tone> = {
  broadcasting: "info",
  accepted: "warning",
  deposit_paid: "success",
  in_progress: "purple",
  completed: "warning",
  disputed: "danger",
  balance_paid: "success",
  closed: "neutral",
  cancelled: "danger",
  no_cleaner_found: "danger",
};

/** `.badge .badge-<tone>` classes for a booking status (falls back to neutral). */
export function bookingBadgeClass(status: string): string {
  const tone = BOOKING_STATUS_TONE[status as BookingStatus] ?? "neutral";
  return `badge badge-${tone}`;
}

/** Compact label for a booking status (falls back to the raw value, prettified). */
export function bookingStatusLabel(status: string): string {
  return (
    BOOKING_STATUS_SHORT[status as BookingStatus] ??
    status.replace(/_/g, " ")
  );
}

const PAYMENT_TONE: Record<string, Tone> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  refunded: "neutral",
};

/** `.badge .badge-<tone>` classes for a payment status. */
export function paymentBadgeClass(status: string): string {
  return `badge badge-${PAYMENT_TONE[status] ?? "neutral"}`;
}
