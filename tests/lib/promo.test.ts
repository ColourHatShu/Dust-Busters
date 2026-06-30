import { describe, it, expect } from "vitest";
import { normalizePromoCode } from "@/lib/promo";

describe("normalizePromoCode", () => {
  it("trims and uppercases", () => {
    expect(normalizePromoCode("  welcome15 ")).toBe("WELCOME15");
    expect(normalizePromoCode("First20")).toBe("FIRST20");
  });
  it("handles null / undefined / empty", () => {
    expect(normalizePromoCode(null)).toBe("");
    expect(normalizePromoCode(undefined)).toBe("");
    expect(normalizePromoCode("   ")).toBe("");
  });
});
