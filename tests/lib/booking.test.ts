import { describe, it, expect } from "vitest";
import {
  hoursUntil,
  isDepositRefundable,
  validateBooking,
  parseBookingDate,
  FREE_CANCEL_HOURS,
} from "@/lib/booking";

const HOUR = 3_600_000;
const NOW = 1_700_000_000_000;
const AREAS = ["Courtenay", "Comox", "Cumberland"] as const;

function inFuture(hours: number): string {
  return new Date(NOW + hours * HOUR).toISOString();
}
const validInput = {
  scheduledLocal: inFuture(48),
  hours: 3,
  area: "Courtenay",
  fullAddress: "123 Cliffe Ave, Courtenay",
  nowMs: NOW,
  areas: AREAS,
};

describe("hoursUntil", () => {
  it("is positive for a future appointment", () => {
    expect(hoursUntil(NOW + 5 * HOUR, NOW)).toBe(5);
  });
  it("is negative for a past appointment", () => {
    expect(hoursUntil(NOW - 2 * HOUR, NOW)).toBe(-2);
  });
});

describe("isDepositRefundable", () => {
  it("is refundable at or beyond the 24h window", () => {
    expect(isDepositRefundable(NOW + 24 * HOUR, NOW)).toBe(true); // exact boundary
    expect(isDepositRefundable(NOW + 48 * HOUR, NOW)).toBe(true);
  });
  it("is not refundable within 24h (or in the past)", () => {
    expect(isDepositRefundable(NOW + 23 * HOUR, NOW)).toBe(false);
    expect(isDepositRefundable(NOW + HOUR, NOW)).toBe(false);
    expect(isDepositRefundable(NOW - HOUR, NOW)).toBe(false);
  });
  it("respects a custom window", () => {
    expect(isDepositRefundable(NOW + 2 * HOUR, NOW, 1)).toBe(true);
    expect(isDepositRefundable(NOW + 0.5 * HOUR, NOW, 1)).toBe(false);
  });
  it("defaults the window to 24 hours", () => {
    expect(FREE_CANCEL_HOURS).toBe(24);
  });
});

describe("validateBooking", () => {
  it("accepts a valid booking and returns the ISO date", () => {
    const r = validateBooking(validInput);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.scheduledISO).toBe(inFuture(48));
  });
  it("rejects an invalid date", () => {
    const r = validateBooking({ ...validInput, scheduledLocal: "not-a-date" });
    expect(r).toEqual({ ok: false, error: "Please choose a valid date and time." });
  });
  it("rejects a date inside the lead window", () => {
    const r = validateBooking({ ...validInput, scheduledLocal: inFuture(0.1) });
    expect(r.ok).toBe(false);
  });
  it("rejects out-of-range or non-integer hours", () => {
    expect(validateBooking({ ...validInput, hours: 0 }).ok).toBe(false);
    expect(validateBooking({ ...validInput, hours: 13 }).ok).toBe(false);
    expect(validateBooking({ ...validInput, hours: 2.5 }).ok).toBe(false);
  });
  it("rejects an area not in the whitelist", () => {
    expect(validateBooking({ ...validInput, area: "Vancouver" }).ok).toBe(false);
  });
  it("rejects a too-short address", () => {
    expect(validateBooking({ ...validInput, fullAddress: "  a " }).ok).toBe(false);
  });

  it("interprets a bare datetime-local as Pacific time, not the server TZ", () => {
    // A far-future bare local value (no Z) — must be read as America/Vancouver.
    const r = validateBooking({ ...validInput, scheduledLocal: "2027-07-15T14:00" });
    expect(r.ok).toBe(true);
    // 14:00 PDT (UTC-7) -> 21:00 UTC
    if (r.ok) expect(r.scheduledISO).toBe("2027-07-15T21:00:00.000Z");
  });
});

describe("parseBookingDate (booking timezone)", () => {
  it("reads a bare datetime-local as Pacific Standard Time (winter, UTC-8)", () => {
    expect(parseBookingDate("2025-01-15T14:00").toISOString()).toBe(
      "2025-01-15T22:00:00.000Z",
    );
  });
  it("reads a bare datetime-local as Pacific Daylight Time (summer, UTC-7)", () => {
    expect(parseBookingDate("2025-07-15T14:00").toISOString()).toBe(
      "2025-07-15T21:00:00.000Z",
    );
  });
  it("treats a timezone-qualified string as an absolute instant", () => {
    expect(parseBookingDate("2025-07-15T21:00:00.000Z").toISOString()).toBe(
      "2025-07-15T21:00:00.000Z",
    );
  });
  it("returns an invalid date for garbage", () => {
    expect(Number.isNaN(parseBookingDate("not-a-date").getTime())).toBe(true);
  });
});
