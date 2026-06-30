// Normalize a promo code the way the DB stores/compares it (trimmed, uppercased).
// Used server-side before validating/applying so "welcome15" === "WELCOME15".
export function normalizePromoCode(input: string | null | undefined): string {
  return (input ?? "").trim().toUpperCase();
}
