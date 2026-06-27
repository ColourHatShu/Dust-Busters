import { describe, it, expect } from "vitest";
import {
  hoursUntil,
  isDepositRefundable,
  FREE_CANCEL_HOURS,
} from "@/lib/booking";

const HOUR = 3_600_000;
const NOW = 1_700_000_000_000;

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
