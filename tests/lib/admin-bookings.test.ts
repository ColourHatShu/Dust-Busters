import { describe, it, expect } from "vitest";
import { bookingMatchesQuery } from "@/lib/admin-bookings";

const row = {
  area: "Courtenay",
  customerName: "Alice Smith",
  cleanerName: "Bob Jones",
};

describe("bookingMatchesQuery", () => {
  it("matches on area, customer, or cleaner (case-insensitive)", () => {
    expect(bookingMatchesQuery(row, "courtenay")).toBe(true);
    expect(bookingMatchesQuery(row, "alice")).toBe(true);
    expect(bookingMatchesQuery(row, "JONES")).toBe(true);
  });
  it("matches substrings", () => {
    expect(bookingMatchesQuery(row, "smi")).toBe(true);
  });
  it("returns false when nothing matches", () => {
    expect(bookingMatchesQuery(row, "zzz")).toBe(false);
  });
  it("treats empty/whitespace/null query as match-all", () => {
    expect(bookingMatchesQuery(row, "")).toBe(true);
    expect(bookingMatchesQuery(row, "   ")).toBe(true);
    expect(bookingMatchesQuery(row, null)).toBe(true);
    expect(bookingMatchesQuery(row, undefined)).toBe(true);
  });
  it("is safe with null fields", () => {
    expect(
      bookingMatchesQuery(
        { area: null, customerName: null, cleanerName: null },
        "anything",
      ),
    ).toBe(false);
  });
});
