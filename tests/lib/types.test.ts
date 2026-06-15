import { describe, it, expect } from "vitest";
import { computePrice, ROLES } from "@/lib/types";

describe("computePrice", () => {
  it("multiplies hours by the hourly rate", () => {
    expect(computePrice(20, 3)).toBe(60);
  });
  it("computes the 60% deposit and 40% balance", () => {
    expect(computePrice(20, 3, 60)).toEqual({ total: 60, deposit: 36, balance: 24 });
  });
});

describe("ROLES", () => {
  it("contains the three roles", () => {
    expect(ROLES).toEqual(["customer", "cleaner", "admin"]);
  });
});
