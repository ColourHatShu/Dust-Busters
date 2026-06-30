import { describe, it, expect } from "vitest";
import {
  SPECIALTIES,
  SPECIALTY_KEYS,
  sanitizeSpecialties,
  specialtyLabels,
} from "@/lib/specialties";

describe("SPECIALTIES taxonomy", () => {
  it("has unique snake_case keys and non-empty labels", () => {
    const keys = SPECIALTIES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const s of SPECIALTIES) {
      expect(s.key).toMatch(/^[a-z_]+$/);
      expect(s.label.length).toBeGreaterThan(0);
    }
    expect(SPECIALTY_KEYS.size).toBe(SPECIALTIES.length);
  });
});

describe("sanitizeSpecialties", () => {
  it("keeps only valid keys, in canonical order, de-duped", () => {
    expect(sanitizeSpecialties(["pet_friendly", "nope", "deep_clean"])).toEqual([
      "deep_clean",
      "pet_friendly",
    ]);
    expect(sanitizeSpecialties(["deep_clean", "deep_clean"])).toEqual([
      "deep_clean",
    ]);
  });
  it("returns [] for empty/invalid input", () => {
    expect(sanitizeSpecialties([])).toEqual([]);
    expect(sanitizeSpecialties(["bogus"])).toEqual([]);
  });
});

describe("specialtyLabels", () => {
  it("maps keys to labels in canonical order, dropping unknowns", () => {
    expect(specialtyLabels(["pet_friendly", "deep_clean", "ghost"])).toEqual([
      "Deep cleaning",
      "Pet-friendly",
    ]);
  });
  it("handles null / undefined / empty", () => {
    expect(specialtyLabels(null)).toEqual([]);
    expect(specialtyLabels(undefined)).toEqual([]);
    expect(specialtyLabels([])).toEqual([]);
  });
});
