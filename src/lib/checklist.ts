// Canonical cleaning scope ("what should we focus on?") taxonomy.
//
// A booking's scope is stored as a `text[]` of these stable keys on
// `bookings.checklist`. The customer picks them on /book; the cleaner sees the
// human labels on the job page once the deposit is paid (same gate as the
// address + notes). Keeping the taxonomy here — pure + framework-free — means
// the form, the storage sanitizer, and both render surfaces share one source of
// truth and stay in canonical order.

export type CleaningTask = { key: string; label: string };
export type CleaningTaskGroup = { group: string; tasks: readonly CleaningTask[] };

export const CLEANING_TASK_GROUPS: readonly CleaningTaskGroup[] = [
  {
    group: "Rooms",
    tasks: [
      { key: "kitchen", label: "Kitchen" },
      { key: "bathrooms", label: "Bathrooms" },
      { key: "bedrooms", label: "Bedrooms" },
      { key: "living_areas", label: "Living & common areas" },
    ],
  },
  {
    group: "Tasks",
    tasks: [
      { key: "floors", label: "Floors — vacuum & mop" },
      { key: "dusting", label: "Dusting & surfaces" },
      { key: "dishes", label: "Dishes" },
      { key: "laundry", label: "Laundry & linens" },
      { key: "trash", label: "Trash & recycling" },
    ],
  },
  {
    group: "Deep-clean extras",
    tasks: [
      { key: "inside_fridge", label: "Inside the fridge" },
      { key: "inside_oven", label: "Inside the oven" },
      { key: "inside_windows", label: "Interior windows" },
      { key: "inside_cabinets", label: "Inside cabinets" },
      { key: "pet_areas", label: "Pet areas" },
    ],
  },
] as const;

export const CLEANING_TASKS: readonly CleaningTask[] = CLEANING_TASK_GROUPS.flatMap(
  (g) => g.tasks,
);

export const CLEANING_TASK_KEYS: ReadonlySet<string> = new Set(
  CLEANING_TASKS.map((t) => t.key),
);

// Keep only valid task keys, de-duplicated, in canonical (taxonomy) order —
// regardless of how the client submitted them. Used server-side before storing
// so arbitrary/spoofed values never reach the database.
export function sanitizeChecklist(keys: readonly string[]): string[] {
  const wanted = new Set(keys);
  return CLEANING_TASKS.filter((t) => wanted.has(t.key)).map((t) => t.key);
}

// Map stored keys → human labels (unknown keys dropped), in canonical order.
export function checklistLabels(
  keys: readonly string[] | null | undefined,
): string[] {
  if (!keys || keys.length === 0) return [];
  const wanted = new Set(keys);
  return CLEANING_TASKS.filter((t) => wanted.has(t.key)).map((t) => t.label);
}
