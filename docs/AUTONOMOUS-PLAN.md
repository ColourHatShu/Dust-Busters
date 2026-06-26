# 🛡️ Autonomous Knight — Backlog / Plan

Priority-ordered. The knight works the **highest unchecked `[ ]` item first**.
Mark `[x]` when done + verified, `[blocked]` if it needs the founder (then log why).
Source: `docs/AUDIT-FINDINGS.json` (6 critical, 37 high, 53 med, 44 low, 36 improvements)
+ brainstorm roadmap (`docs/ROADMAP.md`) + map spec (`docs/specs/uber-cleaner-map.md`).

Before editing schema-bug items, confirm the REAL column names by reading
`supabase/migrations/*.sql` — the code references several columns that don't
exist; fix the CODE to match the real schema (or add an additive migration).
Known truths: `booking_offers.state` (not status); `payments.type` (not
payment_type); `bookings` has NO `updated_at`.

---

> **✅ DB-apply method (WORKS):** apply migrations via the Supabase **pooler**
> from the host using Node + `pg` (run from the **PowerShell** tool — the Bash
> sandbox can't resolve `*.supabase.co`). Pooler host: `aws-1-ca-central-1.pooler.supabase.com`,
> user `postgres.wfazagqgbszrysnothtb`, port `5432`, `ssl:{rejectUnauthorized:false}`;
> DB password is in `docs/HANDOFF.md`. The free-tier project AUTO-PAUSES after 7
> days idle — if hosts stop resolving, the founder must resume it in the dashboard.

## P0 — Critical (security + money-path correctness) — DO FIRST
- [x] **RLS privilege escalation**: `profiles` UPDATE lacked `WITH CHECK` → any user could set `role='admin'`. Fixed via BEFORE UPDATE trigger in `0009_security_hardening.sql`. ✅ **APPLIED + verified live (2026-06-26)**.
- [x] **Cleaner self-verification**: `cleaner_details` let a cleaner set `id_verified=true`. Fixed via trigger forcing admin-only verification in `0009`. ✅ **APPLIED + verified live**.
- [x] **`create_notification` RPC** callable by any user against any recipient (spoofing). Revoked from anon/authenticated/PUBLIC, granted to service_role only, in `0009`. ✅ **APPLIED + verified live**.

## P0 — Critical (from brainstorm roadmap — code + DB) — DO NEXT
> Map migration is now **0010** (0009 was used for security). See docs/ROADMAP.md + docs/specs/uber-cleaner-map.md.
- [x] **Broken reviews query**: `bookings/[id]/page.tsx:104` filtered `reviews.reviewer_id` (no such column) → fixed to check by unique `booking_id` only. ✅ tsc+build+test green (commit on branch).
- [x] **Double-booking guard**: `accept_offer` now rejects accepts that overlap a cleaner's existing committed job (±1h buffer) via `tstzrange &&`; added partial index `bookings_cleaner_sched_active_idx`. Migration `0011` ✅ **APPLIED + verified live**; `acceptJob` surfaces a friendly conflict notice instead of crashing.
- [ ] **Cancellation refund + windows**: `cancel_booking` just sets status; no timing check, no Stripe refund despite 24h policy copy. Make it timing-aware + refund via existing service-role path. (medium, code+migration)
- [x] **Cleaner Online/Offline toggle**: added `cleaner_details.accepting_jobs` (default true) + gated `request_booking` dispatch on it (migration `0012`, APPLIED + verified live); `setAvailability` action + online/offline toggle on the cleaner jobs page. ✅
- [ ] **Honest money/commission**: 15% fee + "Friday direct deposit" is display-only with no payout rail. Add `settings.commission_percent`, persist platform_fee/cleaner_payout per booking, fix earnings copy until Connect ships. (medium)
- [ ] **Cleaner-side issue reporting**: `open_dispute` is customer-only → lone cleaner has no recourse. Generalize to assigned cleaner + admin queue. (small)
- [ ] **Dispatch scheduler heartbeat**: no cron anywhere → offer `expired` never set, `deposit_deadline` never enforced. Add `dispatch_tick()` + schedule (pg_cron or Vercel cron → service-role route). (medium) `[partly founder: cron setup]`
- [blocked] **Real ID verification** (doc upload + admin review, or Stripe Identity) — needs Supabase Storage / Stripe Identity setup. Founder decision; log rationale.
- [ ] **Transactional email/SMS** on money+match events (Resend/Twilio) — `[blocked: needs founder API keys]`; build the channel abstraction now, wire keys later.
- [ ] **Admin refund writes nonexistent columns + fires Stripe refund before a guaranteed-to-fail DB insert** → refund money leaves but is never recorded. Fix column/enum names + order (DB first or transactional). (`admin/disputes/[id]/actions.ts:75-85`)
- [ ] **Stripe chargeback webhook** inserts into `disputes` with nonexistent columns + omits NOT NULL fields → chargebacks silently lost. Reconcile to real `disputes` schema. (`api/stripe/webhook/route.ts:161-169` vs `0008:54-64`)
- [blocked] **`STRIPE_WEBHOOK_SECRET` empty** → all webhooks 400, bookings never advance after payment. FOUNDER must add the signing secret after deploy. (env)

## P1 — High: correctness, feedback, validation, resilience
### Schema-mismatch bugs (fix code to match real columns)
- [ ] Admin dispute `updateDisputeStatus` sets nonexistent `updated_at` → disputes can't be resolved at all. (`admin/disputes/[id]/actions.ts:45`)
- [ ] Admin dispute page queries `payments.payment_type` → refund panel always empty. Use `payments.type`. (`admin/disputes/[id]/page.tsx:62-67,211`)
- [ ] Cleaner acceptance rate reads non-existent `offers` table / `status` col → use `booking_offers.state`. (`admin/cleaners/page.tsx:36-38`)
- [ ] Cleaner profile reviews query selects non-existent `created_by` → reviews + Avg Rating blank. (`admin/cleaners/[id]/page.tsx:60`)
- [ ] Duplicate-review check queries nonexistent `reviews.reviewer_id` → prompt never clears, resubmit errors. (`bookings/[id]/page.tsx:99-106`)
- [ ] Admin dashboard status color map + 'pending' stat use statuses not in the enum. (`admin/page.tsx:58-64,97`)

### Booking / flow correctness
- [ ] Live price estimate on `/book` hardcoded to 3 hrs — make it update with the hours input (client component). (`book/page.tsx:74-87`)
- [ ] Booking allows past dates — add `min` on input + server-side validation. (`book/page.tsx`, `book/actions.ts:13-23`)
- [ ] Booking time stored in server TZ not customer's Pacific — fix tz handling. (`book/actions.ts:13-19`)
- [ ] `deposit_deadline` never set; unpaid `accepted` bookings never auto-expire. Set it in `accept_offer` + enforce. (`0003:145`, `0008:7`)
- [ ] No notification when cleaner accepts/completes (the two transitions that require customer payment). (`cleaner/actions.ts`, `0003`)
- [ ] Cancellation never issues a refund despite stated policy. (`0008:135-168`, `bookings/[id]/page.tsx:334`)
- [ ] `start_job`/`complete_job` swallow errors and fail silently → surface them. (`cleaner/actions.ts:25-35`)
- [ ] Live job feed ignores `bookings` table → deposit-paid / lost-race states never refresh. (`cleaner/jobs/JobsLive.tsx:12-24`)
- [ ] Accept-offer race result (won/lost) discarded → loser gets no feedback. (`cleaner/jobs/page.tsx:155-165`)

### UX feedback & forms
- [ ] Pay-deposit/balance + all server-action forms have no pending/disabled state (double-click risk). Add `useFormStatus` pending buttons. (`bookings/[id]/page.tsx:238-263`)
- [ ] Accept/Decline/Start/Complete buttons have no pending/disabled state. (`cleaner/jobs/page.tsx`)
- [ ] No confirmation on destructive admin actions (cancel/refund/deactivate/override/reassign). (`admin/bookings/[id]/page.tsx`)
- [ ] Settings: no validation on financially-critical values; blanks coerce to 0. Validate rate/deposit. (`admin/settings/actions.ts:30-43`)
- [ ] Add nav link to cleaner profile page. (`Nav.tsx`)

### Resilience / security hardening
- [ ] Add `app/error.tsx` + `app/global-error.tsx` error boundaries. (none exist)
- [ ] Add security headers (CSP/HSTS/X-Frame-Options/Referrer-Policy) in `next.config.ts`. (empty config)
- [ ] `mark-read` POST has no origin/CSRF check — add same-origin guard.

## P-FLAGSHIP — Uber-style live cleaner map  ⭐ (see docs/specs/uber-cleaner-map.md)
- [ ] Map library: react-leaflet + OpenStreetMap (no API key), SSR-safe dynamic import.
- [ ] Migration: approximate, privacy-jittered cleaner coordinates (never real homes) + RLS-safe RPC returning only safe pins for an area/booking.
- [ ] `MatchingMap` client component on `/bookings/[id]` while `status=broadcasting`: area-centered map, animated cleaner pins, radar "finding your cleaner" pulse, notified-count, cancel-search, accept transition → cleaner card; `no_cleaner_found` fallback.
- [ ] Realtime wiring (subscribe to this booking's offers/status) + bug-free edge cases (zero cleaners, all decline, timeout, mid-search cancel, tile failure).
> Full UX + technical spec is being finalized from the brainstorm into
> `docs/specs/uber-cleaner-map.md`; refine these sub-items from it.

## P2 — High-value features (finalize from docs/ROADMAP.md)
- [ ] Open Graph / Twitter card metadata + `metadataBase` (per-page titles/descriptions).
- [ ] Terms of Service + Privacy Policy pages (legal/trust for a payments marketplace).
- [ ] `.env.example` documenting all required env vars; real `README.md` (setup/env/migrate/deploy).
- [ ] Route-level `loading.tsx` skeletons (customer + admin).
- [ ] Search/filter on bookings, customers, cleaners admin lists.
- [ ] Payment receipts/invoices (view/download).
- [ ] `no_cleaner_found` retry / re-broadcast path + customer notification.
- [ ] Rate limiting on booking broadcast, messaging, checkout, auth.
- [ ] Star-rating UI for the review form; "Book again" prefill; mark-notification-read-on-click.
- [ ] Cleaner payout system (Stripe Connect) — LARGE; founder decision (log rationale; needs Stripe Connect setup → likely partly [blocked]).

## P3 — Polish / nice-to-have
- [ ] Skip-to-content link; hide decorative icons from SR (`aria-hidden`); aria-live for status updates.
- [ ] Offer card: expiry countdown + cleaner take-home (net) amount.
- [ ] CI workflow + meaningful test coverage; pin Node `engines`.
- [ ] `vercel.json`; image optimization `remotePatterns` for Supabase storage.
- [ ] Static generation/revalidation for marketing pages.

## ⛔ Founder-only (cannot automate — log, don't attempt)
- Stripe live keys + `STRIPE_WEBHOOK_SECRET`; `NEXT_PUBLIC_BASE_URL` real URL; Vercel deploy; rotate Supabase service-role key + DB password.
