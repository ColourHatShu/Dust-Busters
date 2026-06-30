// Shared search predicate for the admin bookings list + CSV export, so the page
// and the export "export what you see" stay in lockstep. PostgREST can't cleanly
// OR a base column against two different embedded relations in one query, so the
// q (free-text) match is applied in JS after the fetch — across the booking's
// area, customer name, and cleaner name (case-insensitive substring).

export function bookingMatchesQuery(
  fields: {
    area?: string | null;
    customerName?: string | null;
    cleanerName?: string | null;
  },
  q: string | null | undefined,
): boolean {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return true;
  return [fields.area, fields.customerName, fields.cleanerName].some((v) =>
    (v ?? "").toLowerCase().includes(needle),
  );
}
