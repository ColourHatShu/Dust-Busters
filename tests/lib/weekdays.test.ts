import { describe, it, expect } from "vitest";
import { WEEKDAYS, sanitizeWorkDays, workDayLabels } from "@/lib/weekdays";

describe("WEEKDAYS taxonomy", () => {
  it("is Sun..Sat with DOW values 0..6", () => {
    expect(WEEKDAYS.map((d) => d.value)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(WEEKDAYS[0].label).toBe("Sun");
    expect(WEEKDAYS[6].label).toBe("Sat");
  });
});

describe("sanitizeWorkDays", () => {
  it("keeps valid DOW values in week order, de-duped", () => {
    expect(sanitizeWorkDays(["6", "1", "1"])).toEqual([1, 6]);
    expect(sanitizeWorkDays([3, 0, 5])).toEqual([0, 3, 5]);
  });
  it("drops out-of-range / non-numeric values", () => {
    expect(sanitizeWorkDays(["7", "-1", "x", "2"])).toEqual([2]);
  });
  it("returns [] for empty input", () => {
    expect(sanitizeWorkDays([])).toEqual([]);
  });
});

describe("workDayLabels", () => {
  it("maps values to short labels in week order", () => {
    expect(workDayLabels([6, 0, 1])).toEqual(["Sun", "Mon", "Sat"]);
  });
  it("handles null / undefined / empty", () => {
    expect(workDayLabels(null)).toEqual([]);
    expect(workDayLabels(undefined)).toEqual([]);
    expect(workDayLabels([])).toEqual([]);
  });
});
