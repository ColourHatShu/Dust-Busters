import Stripe from "stripe";

// Server-side Stripe client. The placeholder fallback keeps the constructor from
// throwing at build time when env vars are not present; the real key is used at
// runtime in production.
// `||` (not `??`) so an empty-string env var — common in CI/deploy configs where
// the key exists but is unset — still falls back to the placeholder instead of
// crashing the build. The real key is required at runtime to actually charge.
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_placeholder",
  { typescript: true }
);

export const CURRENCY = "cad";

export function baseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}
