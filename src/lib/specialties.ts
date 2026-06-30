// Canonical cleaner specialty taxonomy.
//
// A cleaner's specialties are stored as a `text[]` of these stable keys on
// `cleaner_details.specialties`. The cleaner picks them on their profile; they
// show as chips on the customer-facing cleaner card (a trust + future-filtering
// signal). Same single-source-of-truth pattern as lib/checklist.ts.

export type Specialty = { key: string; label: string };

export const SPECIALTIES: readonly Specialty[] = [
  { key: "deep_clean", label: "Deep cleaning" },
  { key: "move_in_out", label: "Move-in / move-out" },
  { key: "pet_friendly", label: "Pet-friendly" },
  { key: "eco_products", label: "Eco-friendly products" },
  { key: "windows", label: "Interior windows" },
  { key: "laundry", label: "Laundry & ironing" },
  { key: "post_reno", label: "Post-renovation" },
  { key: "office", label: "Offices & commercial" },
  { key: "organizing", label: "Decluttering & organizing" },
] as const;

export const SPECIALTY_KEYS: ReadonlySet<string> = new Set(
  SPECIALTIES.map((s) => s.key),
);

// Keep only valid keys, de-duplicated, in canonical order — used server-side
// before storing so arbitrary/spoofed values never reach the database.
export function sanitizeSpecialties(keys: readonly string[]): string[] {
  const wanted = new Set(keys);
  return SPECIALTIES.filter((s) => wanted.has(s.key)).map((s) => s.key);
}

// Map stored keys → human labels (unknown keys dropped), in canonical order.
export function specialtyLabels(
  keys: readonly string[] | null | undefined,
): string[] {
  if (!keys || keys.length === 0) return [];
  const wanted = new Set(keys);
  return SPECIALTIES.filter((s) => wanted.has(s.key)).map((s) => s.label);
}
