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
- [x] **Cancellation refund + windows**: `cancelBooking` now checks the 24h window — if a deposit was paid and the appointment is ≥24h away, it issues a Stripe refund, records it (reusing the 0013 refund path), and marks the deposit `refunded`; within 24h the deposit is forfeit. Notifies the assigned cleaner; shows a refund-outcome banner on the booking page. Code-only (no migration). ✅
- [x] **Cleaner Online/Offline toggle**: added `cleaner_details.accepting_jobs` (default true) + gated `request_booking` dispatch on it (migration `0012`, APPLIED + verified live); `setAvailability` action + online/offline toggle on the cleaner jobs page. ✅
- [x] **Honest money/commission**: migration `0015` adds configurable `settings.commission_percent` and stores `platform_fee`/`cleaner_payout` per booking (computed in `request_booking`, existing rows backfilled). Earnings page now shows the real stored take-home and replaces the false "Friday direct deposit" promise with honest copy. Admin settings exposes commission % (with validation). APPLIED + verified live. ✅
- [x] **Cleaner-side issue reporting**: `open_dispute` (migration `0014`) now authorises the assigned cleaner (or admin), not just the customer. Added a "Report a problem" form on the cleaner job page → flows into the same admin dispute queue. APPLIED + verified live. ✅
- [~] **Broadcast expiry — done lazily (no cron):** `expire_booking_if_stale` (migration `0019`, applied + verified) flips a stale `broadcasting` booking to `no_cleaner_found` + expires its rung offers; called on the booking page read. ✅ The full `dispatch_tick()` cron (proactive expiry for the cleaner side + `deposit_deadline` enforcement) remains `[partly founder: cron setup]`.
- [blocked] **Real ID verification** (doc upload + admin review, or Stripe Identity) — needs Supabase Storage / Stripe Identity setup. Founder decision; log rationale.
- [ ] **Transactional email/SMS** on money+match events (Resend/Twilio) — `[blocked: needs founder API keys]`; build the channel abstraction now, wire keys later.
- [ ] **Admin refund writes nonexistent columns + fires Stripe refund before a guaranteed-to-fail DB insert** → refund money leaves but is never recorded. Fix column/enum names + order (DB first or transactional). (`admin/disputes/[id]/actions.ts:75-85`)
- [ ] **Stripe chargeback webhook** inserts into `disputes` with nonexistent columns + omits NOT NULL fields → chargebacks silently lost. Reconcile to real `disputes` schema. (`api/stripe/webhook/route.ts:161-169` vs `0008:54-64`)
- [blocked] **`STRIPE_WEBHOOK_SECRET` empty** → all webhooks 400, bookings never advance after payment. FOUNDER must add the signing secret after deploy. (env)

## P1 — High: correctness, feedback, validation, resilience
### Schema-mismatch bugs (fix code to match real columns)
- [x] Admin dispute `updateDisputeStatus` set nonexistent `updated_at` → removed; admins can resolve disputes again. ✅
- [x] Admin dispute page queried `payments.payment_type` → fixed to `type` (select/neq/render); removed a no-op `onChange` that would crash the server-rendered select. ✅
- [x] **Admin `issueRefund` (critical)**: wrote nonexistent `payment_type`/`notes`/`updated_at` + invalid enum `'refund'` → Stripe refunded but DB write always failed. Migration `0013` adds `'refund'` to `payment_type`, `'refunded'` to `payment_status`, and a `notes` column; `issueRefund` now records the refund correctly, marks the original payment `refunded`, and surfaces DB errors. ✅ APPLIED + verified live. **Unblocks the cancellation-refund item.**
- [x] Cleaner acceptance rate: `offers`/`status` → `booking_offers`/`state` (list + profile). ✅
- [x] Cleaner profile reviews: resolved via the cleaner's booking ids (reviews have no `cleaner_id`/`created_by`); reviewer name from the booking's customer; Avg Rating renders. ✅
- [x] Duplicate-review check fixed earlier (uses unique `booking_id`, not `reviewer_id`). ✅
- [x] Admin dashboard: real `booking_status` color map (was `pending`/`confirmed`), `cleaner_details.id` → `profile_id` for the active-cleaners count, and a real "active" stat instead of the always-0 "pending". ✅

### Booking / flow correctness
- [x] Live price estimate on `/book` now reactive via a `PriceEstimator` client component (total + deposit update with the hours input). ✅
- [x] Booking past-date prevention: `min` on the date input + authoritative server-side validation (future ≥15min, hours 1–12 int, area whitelist, non-empty address). ✅
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
- [x] Settings: now validates hourly rate (>0), deposit % and commission % (0–100) and rejects blanks instead of coercing to 0. ✅ (done with the commission cluster)
- [ ] Add nav link to cleaner profile page. (`Nav.tsx`)

### Resilience / security hardening
- [x] Added `app/error.tsx` (route boundary with Try-again/Go-home + console.error), `app/global-error.tsx` (inline-styled root boundary), and `app/not-found.tsx` (branded 404). ✅
- [x] Security headers in `next.config.ts`: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (always) + a Stripe/Supabase-aware CSP (production-only, so dev HMR isn't broken). ✅
- [ ] `mark-read` POST has no origin/CSRF check — add same-origin guard.

## 🎯 P-FLAGSHIP — Uber-style live cleaner map  ⭐ ACTIVE (see docs/specs/uber-cleaner-map.md)
- [x] **Data foundation (migration `0016`, APPLIED + verified live):** `area_centroids`,
  `cleaner_details.approx_lat/lng`, `bookings.broadcast_expires_at` + `settings.broadcast_ttl_mins`
  (set via insert trigger), deterministic `fuzz_pin()` (verified stable + per-booking), and the
  authorising/fuzzing `get_booking_matching(booking_id)` RPC — the ONLY path map data reaches the
  client (no cleaner_id / real coords ever cross the wire).
- [x] **Map library** `react-leaflet@5` + `leaflet@1.9` + OSM tiles (no API key), SSR-safe via `dynamic(ssr:false)`, `L.divIcon` CSS markers. ✅ (build passes, no window/SSR error)
- [x] **`MatchingMap`** on `/bookings/[id]` while `status ∈ {broadcasting, accepted, no_cleaner_found}`: area-centered OSM map, fuzzed pulsing cleaner pins, radar "finding your cleaner" sweep, notified/deciding counts, winner reveal → cleaner card, no-cleaner state. Fed by the `get_booking_matching` RPC + server-rendered initial data. ✅
- [x] Map polish round 1: **dark CARTO basemap** (matches the app's theme, no API key) + **"Cancel search" CTA** during broadcasting. ✅
- [x] Polish round 2a: Supabase **realtime** on the booking row in `MatchingMap` → instant winner reveal when a cleaner accepts (poll kept for the RLS-restricted offer counts/pins). ✅
- [x] **Re-broadcast** on `no_cleaner_found`: `rebroadcast_booking` RPC (migration `0017`, applied + verified) clears stale offers, re-rings available cleaners, reopens the search; "Search again" button on the map's no-cleaner state. ✅
- [x] **SVG fallback basemap** on tile failure — `SvgBasemap` (stylized projected pins + coverage rings) shown if CARTO/OSM tiles error (≥4 errors or 6s with no tile loaded). Never a broken gray box. ✅
> 🏁 **Flagship Uber-style map is COMPLETE end-to-end:** data RPC · visible dark map · realtime winner reveal · cancel-search · re-broadcast · SVG fallback.
> Full UX + technical spec is being finalized from the brainstorm into
> `docs/specs/uber-cleaner-map.md`; refine these sub-items from it.

## P2 — High-value features (finalize from docs/ROADMAP.md)
- [x] Open Graph / Twitter metadata + `metadataBase` (silences the build warning), a title template (`%s · Dust Busters`), and an asset-free branded OG image via `next/og` `ImageResponse` (`opengraph-image` + `twitter-image`). Per-page titles on about/book. ✅
- [ ] Terms of Service + Privacy Policy pages (legal/trust for a payments marketplace).
- [x] `.env.example` (all required env vars, no secrets; gitignore exception so it's tracked) + a real `README.md` (stack, setup, run, migrations, first-admin, status flow, Vercel deploy, doc index). ✅
- [x] Route-level `loading.tsx` skeletons on all 22 data-fetching routes (customer + admin), via a shared `Skeleton` kit (List/Detail/Form/Dashboard/Table variants, animate-pulse). ✅
- [x] Search/filter on admin lists via a shared JS-free `AdminSearch` (GET): customers + cleaners by name/phone (`.or ilike`), bookings by area + a status dropdown. Also fixed the bookings list's stale `pending`/`confirmed` status-color map → real enum values. ✅
- [x] **Payment receipt** on the booking page — itemized deposit / balance / refund rows (date · status · amount) with a "Net paid" total; RLS-scoped to the customer's own booking. ✅
- [ ] `no_cleaner_found` retry / re-broadcast path + customer notification.
- [ ] Rate limiting on booking broadcast, messaging, checkout, auth.
- [x] **Star-rating UI** for the review form — interactive `StarRating` (hover preview + labels) + a fully rebranded review page (card, back link, branded button). ✅
- [x] **Mark-notification-read-on-click** — each notification is now a clickable row (`markRead` action) that clears its unread state and opens its booking if it has one. ✅
- [x] **"Book again" prefill** — the existing Book-again button now passes `?hours=&area=` and `/book` prefills the estimator hours + area select (validated; address never in the URL). ✅
- [ ] Cleaner payout system (Stripe Connect) — LARGE; founder decision (log rationale; needs Stripe Connect setup → likely partly [blocked]).

## P2 — From ideation (2026-06-27 backlog refresh)
- [x] **Favorite cleaners — phase 1**: heart toggle on the booking page activates the stranded `customer_favorites` table (RLS-scoped insert/delete). ✅
- [x] **Favorites — phase 2a**: a "Favorite cleaners" list on the account page (name · ⭐rating · verified · jobs) with a one-tap remove (`removeFavorite`). ✅
- [ ] **Favorites — phase 2b**: book-a-favorite (priority/direct offer to a saved cleaner).
- [x] **Saved addresses**: `saved_addresses` table (migration `0018`, RLS-scoped, applied + verified) + account CRUD (add/delete, optional label) + a JS-free `<datalist>` autocomplete on the `/book` address field. ✅
- [x] **Cleaner "Today"/schedule view**: my-jobs now grouped into Today / Upcoming / Earlier (by `scheduled_at`) with per-group counts. ✅
- [x] **Two-way reviews**: `customer_reviews` table + `get_customer_rating` RPC (migration `0020`, applied + verified). The assigned cleaner can rate the customer/property after a finished job (reuses the StarRating UI); the customer's overall rating shows on the job. ✅
- [ ] **Reschedule a booking** before deposit (change date/time + refresh broadcast window).

## P3 — Polish / nice-to-have
- [x] **Skip-to-content link** in the layout (sr-only until focused → jumps to `#main-content`). ✅
- [ ] Hide remaining decorative icons from SR (`aria-hidden`); aria-live for live status/notification updates.
- [x] Offer card: live **expiry countdown** (`Countdown` client component, from `broadcast_expires_at`) + the cleaner's **take-home** (`cleaner_payout`) shown as the headline amount with the gross as subtext. ✅
- [x] **CI workflow** (`.github/workflows/ci.yml`) — typecheck + unit tests + production build on push/PR (dummy env so build needs no secrets); pinned Node `engines` (>=20). ✅
- [x] Expand test coverage: pure `src/lib/booking.ts` now holds the refund-window logic AND `validateBooking` (booking input validation), both extracted from their server actions and covered by boundary tests. Suite: **15 tests / 2 files**. ✅
- [ ] `vercel.json`; image optimization `remotePatterns` for Supabase storage.
- [ ] Static generation/revalidation for marketing pages.

## ⛔ Founder-only (cannot automate — log, don't attempt)
- Stripe live keys + `STRIPE_WEBHOOK_SECRET`; `NEXT_PUBLIC_BASE_URL` real URL; Vercel deploy; rotate Supabase service-role key + DB password.
