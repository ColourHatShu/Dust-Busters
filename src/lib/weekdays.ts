// Canonical weekday taxonomy for a cleaner's recurring work schedule.
//
// Stored as `cleaner_details.work_days int[]` of Postgres DOW values (0=Sunday …
// 6=Saturday — matching `extract(dow …)`). NULL / empty = available every day
// (the dispatcher only filters when a cleaner has opted into specific days).

export type Weekday = { value: number; label: string; long: string };

export const WEEKDAYS: readonly Weekday[] = [
  { value: 0, label: "Sun", long: "Sunday" },
  { value: 1, label: "Mon", long: "Monday" },
  { value: 2, label: "Tue", long: "Tuesday" },
  { value: 3, label: "Wed", long: "Wednesday" },
  { value: 4, label: "Thu", long: "Thursday" },
  { value: 5, label: "Fri", long: "Friday" },
  { value: 6, label: "Sat", long: "Saturday" },
];

// Keep only valid DOW values (0–6), de-duplicated, in week order. Used
// server-side before storing so arbitrary values never reach the database.
export function sanitizeWorkDays(values: readonly (string | number)[]): number[] {
  const wanted = new Set(values.map((v) => Number(v)));
  return WEEKDAYS.filter((d) => wanted.has(d.value)).map((d) => d.value);
}

// Map stored DOW values → short labels, in week order (unknown values dropped).
export function workDayLabels(
  values: readonly number[] | null | undefined,
): string[] {
  if (!values || values.length === 0) return [];
  const wanted = new Set(values.map(Number));
  return WEEKDAYS.filter((d) => wanted.has(d.value)).map((d) => d.label);
}
