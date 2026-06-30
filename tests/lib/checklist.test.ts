import { describe, it, expect } from "vitest";
import {
  CLEANING_TASKS,
  CLEANING_TASK_KEYS,
  sanitizeChecklist,
  checklistLabels,
} from "@/lib/checklist";

describe("CLEANING_TASKS taxonomy", () => {
  it("has unique, non-empty keys and labels", () => {
    const keys = CLEANING_TASKS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const t of CLEANING_TASKS) {
      expect(t.key).toMatch(/^[a-z_]+$/);
      expect(t.label.length).toBeGreaterThan(0);
    }
  });
  it("exposes the key set matching the task list", () => {
    expect(CLEANING_TASK_KEYS.size).toBe(CLEANING_TASKS.length);
  });
});

describe("sanitizeChecklist", () => {
  it("keeps only valid keys", () => {
    expect(sanitizeChecklist(["kitchen", "not_a_task", "dishes"])).toEqual([
      "kitchen",
      "dishes",
    ]);
  });
  it("returns canonical (taxonomy) order regardless of input order", () => {
    // dishes comes after kitchen in the taxonomy, so it sorts back.
    expect(sanitizeChecklist(["dishes", "kitchen"])).toEqual([
      "kitchen",
      "dishes",
    ]);
  });
  it("de-duplicates repeated keys", () => {
    expect(sanitizeChecklist(["kitchen", "kitchen"])).toEqual(["kitchen"]);
  });
  it("returns an empty array for no/invalid input", () => {
    expect(sanitizeChecklist([])).toEqual([]);
    expect(sanitizeChecklist(["bogus"])).toEqual([]);
  });
});

describe("checklistLabels", () => {
  it("maps stored keys to human labels in canonical order", () => {
    expect(checklistLabels(["dishes", "kitchen"])).toEqual([
      "Kitchen",
      "Dishes",
    ]);
  });
  it("drops unknown keys", () => {
    expect(checklistLabels(["kitchen", "ghost"])).toEqual(["Kitchen"]);
  });
  it("handles null / undefined / empty", () => {
    expect(checklistLabels(null)).toEqual([]);
    expect(checklistLabels(undefined)).toEqual([]);
    expect(checklistLabels([])).toEqual([]);
  });
});
