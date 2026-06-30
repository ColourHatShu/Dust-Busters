import { describe, it, expect } from "vitest";
import {
  bookingBadgeClass,
  bookingStatusLabel,
  paymentBadgeClass,
  BOOKING_STATUS_SHORT,
} from "@/lib/status";

describe("bookingBadgeClass", () => {
  it("maps known statuses to their design-system tone", () => {
    expect(bookingBadgeClass("broadcasting")).toBe("badge badge-info");
    expect(bookingBadgeClass("deposit_paid")).toBe("badge badge-success");
    expect(bookingBadgeClass("in_progress")).toBe("badge badge-purple");
    expect(bookingBadgeClass("cancelled")).toBe("badge badge-danger");
    expect(bookingBadgeClass("closed")).toBe("badge badge-neutral");
  });
  it("falls back to neutral for an unknown status", () => {
    expect(bookingBadgeClass("totally_unknown")).toBe("badge badge-neutral");
  });
});

describe("bookingStatusLabel", () => {
  it("returns the compact label for known statuses", () => {
    expect(bookingStatusLabel("broadcasting")).toBe("Finding cleaner");
    expect(bookingStatusLabel("no_cleaner_found")).toBe("No cleaner found");
    expect(bookingStatusLabel("balance_paid")).toBe("Paid in full");
  });
  it("prettifies an unknown status (underscores to spaces)", () => {
    expect(bookingStatusLabel("some_new_state")).toBe("some new state");
  });
  it("has a non-empty short label for every defined booking status", () => {
    // Guards against adding a status without a compact label.
    for (const label of Object.values(BOOKING_STATUS_SHORT)) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe("paymentBadgeClass", () => {
  it("maps payment statuses to tones", () => {
    expect(paymentBadgeClass("paid")).toBe("badge badge-success");
    expect(paymentBadgeClass("pending")).toBe("badge badge-warning");
    expect(paymentBadgeClass("failed")).toBe("badge badge-danger");
    expect(paymentBadgeClass("refunded")).toBe("badge badge-neutral");
  });
  it("falls back to neutral for an unknown payment status", () => {
    expect(paymentBadgeClass("weird")).toBe("badge badge-neutral");
  });
});
