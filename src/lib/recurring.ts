// Recurring-booking cadence taxonomy. A booking can repeat every 1, 2, or 4
// weeks; "one-time" (no recurrence) is the default. Stored as
// recurring_series.frequency_weeks; the form submits the same string values.

export type RecurrenceOption = {
  value: string;
  label: string;
  weeks: number | null;
};

export const RECURRENCE_OPTIONS: readonly RecurrenceOption[] = [
  { value: "0", label: "One-time", weeks: null },
  { value: "1", label: "Every week", weeks: 1 },
  { value: "2", label: "Every 2 weeks", weeks: 2 },
  { value: "4", label: "Every 4 weeks", weeks: 4 },
];

const VALID_WEEKS = new Set([1, 2, 4]);

// Parse a submitted frequency into a valid week count, or null for one-time /
// anything invalid (never trust the client).
export function parseFrequencyWeeks(
  v: string | number | null | undefined,
): number | null {
  const n = Number(v);
  return VALID_WEEKS.has(n) ? n : null;
}

// Human label for a stored frequency (null/unknown → "One-time").
export function frequencyLabel(weeks: number | null | undefined): string {
  const opt = RECURRENCE_OPTIONS.find((o) => o.weeks === weeks);
  return opt ? opt.label : "One-time";
}
