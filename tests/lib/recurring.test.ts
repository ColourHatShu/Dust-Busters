import { describe, it, expect } from "vitest";
import {
  RECURRENCE_OPTIONS,
  parseFrequencyWeeks,
  frequencyLabel,
} from "@/lib/recurring";

describe("RECURRENCE_OPTIONS", () => {
  it("offers one-time + 1/2/4 week cadences", () => {
    expect(RECURRENCE_OPTIONS.map((o) => o.weeks)).toEqual([null, 1, 2, 4]);
  });
});

describe("parseFrequencyWeeks", () => {
  it("accepts 1, 2, 4 (string or number)", () => {
    expect(parseFrequencyWeeks("1")).toBe(1);
    expect(parseFrequencyWeeks(2)).toBe(2);
    expect(parseFrequencyWeeks("4")).toBe(4);
  });
  it("returns null for one-time / invalid", () => {
    expect(parseFrequencyWeeks("0")).toBeNull();
    expect(parseFrequencyWeeks(3)).toBeNull();
    expect(parseFrequencyWeeks("weekly")).toBeNull();
    expect(parseFrequencyWeeks(null)).toBeNull();
    expect(parseFrequencyWeeks(undefined)).toBeNull();
  });
});

describe("frequencyLabel", () => {
  it("labels known cadences", () => {
    expect(frequencyLabel(1)).toBe("Every week");
    expect(frequencyLabel(2)).toBe("Every 2 weeks");
    expect(frequencyLabel(4)).toBe("Every 4 weeks");
  });
  it("falls back to One-time", () => {
    expect(frequencyLabel(null)).toBe("One-time");
    expect(frequencyLabel(3)).toBe("One-time");
  });
});
