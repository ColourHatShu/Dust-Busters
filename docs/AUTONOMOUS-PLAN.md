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
- [x] **Transactional email/SMS** on money+match events — channel abstraction built: `src/lib/messaging.ts` (`sendEmail` via Resend, `sendSms` via Twilio, `isEmailConfigured`/`isSmsConfigured`; best-effort, never throws). Wired into `createNotification`: key money/match types (cleaner_found, deposit_paid/received, balance_received, job_completed, booking_expired/released) are mirrored to email — a **zero-cost no-op until `RESEND_API_KEY`/`RESEND_FROM` are set** (no user lookup or network without keys), then it activates instantly. `.env.example` documents the optional Resend/Twilio vars. ✅ tsc+build+tests green. **⛔ Activation needs founder API keys** (Resend/Twilio).
- [x] **Admin refund writes nonexistent columns + fires Stripe refund before a guaranteed-to-fail DB insert** — already resolved by the `issueRefund` rewrite + migration `0013` (correct `type`/`notes` columns, amount validation, refunds the selected payment, surfaces the DB error). Verified current code is correct. ✅ (stale duplicate of the P1 issueRefund item)
- [x] **Stripe chargeback webhook** inserted into `disputes` with nonexistent columns (`payment_id`/`stripe_dispute_id`/`reason`/`amount`) + a Stripe status + omitted the NOT NULL `raised_by`/`category`/`description` → every chargeback insert failed silently. Now maps onto the real `0008` schema: raised_by = the booking's customer (cardholder), category `payment_issue`, composed description (Stripe reason/amount/id), status `open`; idempotent (guards on an existing open payment_issue dispute since there's no `stripe_dispute_id` column). Code-only, no migration. ✅ tsc+build+tests green. (`api/stripe/webhook/route.ts`)
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
- [x] Booking time stored in server TZ not customer's Pacific → `parseBookingDate` now reads a bare `datetime-local` value as `America/Vancouver` wall-time (DST-aware via Intl), so a 2pm Pacific booking is no longer shifted to 2pm UTC on the Vercel host. TZ-qualified strings stay absolute (keeps existing tests). +5 unit tests (PST/PDT/passthrough). ✅ tsc+build+tests (20) green. (`lib/booking.ts`)
- [x] `deposit_deadline` never set; unpaid `accepted` bookings never auto-expired (held the cleaner's slot forever) → migration `0029` (APPLIED + verified live via pooler): `settings.deposit_ttl_mins` (default 1440), `accept_offer` now stamps `deposit_deadline = now() + ttl`, and `expire_unpaid_acceptance(booking)` lazily cancels an overdue-unpaid acceptance (frees the cleaner, expires offers, notifies both). Enforced on read from the customer booking page + the cleaner jobs page (mirrors the 0019 broadcast expiry). ✅ tsc+build+tests green. (`0029`, `bookings/[id]/page.tsx`, `cleaner/jobs/page.tsx`)
- [x] No notification when cleaner accepts/completes (the two transitions that require customer payment) → accept is notified by the `accept_offer` RPC (migration 0024, "Cleaner found — pay your deposit"); `completeJob` now notifies "cleaning complete — pay the balance" via `createNotification` in the action. (Note: an earlier action-side accept notification was a duplicate of the RPC's and was removed during the 0029 work.) ✅ (`cleaner/actions.ts`)
- [x] Cancellation refund — already implemented: `cancelBooking` issues a Stripe refund when the appointment is ≥24h out (deposit forfeit within 24h), records the refund row, and notifies the cleaner. Verified. (stale duplicate of the P0 cancellation-refund item) (`cancel-actions.ts`)
- [x] `start_job`/`complete_job` swallow errors and fail silently → already surfaced: both log + `jobsError(...)` redirect to the jobs list with a friendly banner instead of swallowing. Verified. ✅ (`cleaner/actions.ts`)
- [x] Live job feed ignored the `bookings` table → added a second realtime subscription on `bookings` filtered by `cleaner_id`, so the cleaner's list auto-refreshes when an assigned booking changes status (deposit_paid / cancelled / reassigned), not just on offer changes. ✅ tsc+build+tests green. (`cleaner/jobs/JobsLive.tsx`)
- [x] Accept-offer race result (won/lost) discarded → `acceptJob` now redirects with `?notice=won`/`?notice=lost`; the jobs page shows a success banner on a win and a friendly "another cleaner accepted first" banner on a loss. ✅ tsc+build+tests green. (`cleaner/actions.ts`, `cleaner/jobs/page.tsx`)

### UX feedback & forms
- [x] Pay-deposit/balance forms had no pending/disabled state (double-click → double-charge risk) → added a shared client `SubmitButton` (`useFormStatus`: disables + shows a pending label + `aria-busy` while the action is in flight); wired into the deposit + balance pay forms. Other forms can adopt it incrementally. ✅ (`components/SubmitButton.tsx`, `bookings/[id]/page.tsx`)
- [x] Accept/Decline/Start/Complete buttons had no pending/disabled state → now use `SubmitButton` (Accepting…/Declining…/Starting…/Completing…). ✅ (`cleaner/jobs/page.tsx`)
- [x] No confirmation on destructive admin actions → added a shared `ConfirmSubmit` (confirm dialog + `useFormStatus` pending/disabled) and wired it into: override status, cancel booking, reassign cleaner (`admin/bookings/[id]`), issue refund (`admin/disputes/[id]` — money, irreversible), and verify/deactivate toggles (`admin/cleaners/[id]`). ✅ tsc+build+tests green. (`components/ConfirmSubmit.tsx`)
- [x] Settings: now validates hourly rate (>0), deposit % and commission % (0–100) and rejects blanks instead of coercing to 0. ✅ (done with the commission cluster)
- [x] Add nav link to cleaner profile page — already present: `Nav.tsx` pushes a "Profile" link for the cleaner role. Verified.

### Resilience / security hardening
- [x] Added `app/error.tsx` (route boundary with Try-again/Go-home + console.error), `app/global-error.tsx` (inline-styled root boundary), and `app/not-found.tsx` (branded 404). ✅
- [x] Security headers in `next.config.ts`: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (always) + a Stripe/Supabase-aware CSP (production-only, so dev HMR isn't broken). ✅
- [x] `mark-read` POST had no origin/CSRF check → added an `isCrossOrigin` guard that 403s cross-site fetches (`Sec-Fetch-Site: cross-site`) and Origin/Host mismatches before the auth + RLS checks. ✅ tsc+build+tests green. (`api/notifications/mark-read/route.ts`)

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
- [x] Terms of Service + Privacy Policy pages → `/terms` + `/privacy`, written to match the actual app behavior (deposit/balance via Stripe, 24h cancellation/refund window, address-private-until-confirmed, independent cleaners, reviews/disputes, data handling via Stripe/Supabase). Premium light layout (design system), cross-linked, + Footer links. ✅ tsc+build+tests green. (`app/terms`, `app/privacy`, `components/Footer.tsx`)
- [x] `.env.example` (all required env vars, no secrets; gitignore exception so it's tracked) + a real `README.md` (stack, setup, run, migrations, first-admin, status flow, Vercel deploy, doc index). ✅
- [x] Route-level `loading.tsx` skeletons on all 22 data-fetching routes (customer + admin), via a shared `Skeleton` kit (List/Detail/Form/Dashboard/Table variants, animate-pulse). ✅
- [x] Search/filter on admin lists via a shared JS-free `AdminSearch` (GET): customers + cleaners by name/phone (`.or ilike`), bookings by area + a status dropdown. Also fixed the bookings list's stale `pending`/`confirmed` status-color map → real enum values. ✅
- [x] **Payment receipt** on the booking page — itemized deposit / balance / refund rows (date · status · amount) with a "Net paid" total; RLS-scoped to the customer's own booking. ✅
- [x] `no_cleaner_found` retry / re-broadcast — already shipped: `rebroadcast_booking` RPC (0017) + "Search again" on the matching map reopen the search. Verified. (stale duplicate of the flagship re-broadcast item)
- [blocked] Rate limiting on booking broadcast, messaging, checkout, auth. **Needs the founder in the loop:** (1) on Vercel/serverless an effective limiter needs a shared store — either an Upstash/Redis (founder keys) or a Supabase-backed counter table — and the founder should choose the deploy-env approach + the actual thresholds; (2) **auth** rate-limiting is already handled server-side by Supabase Auth (app code can't meaningfully add to it); (3) it touches the core money-path RPCs (request_booking/messaging/checkout), so it's not a safe unattended change. Revisit once the deploy target + limits are decided. (logged 2026-06-30)
- [x] **Star-rating UI** for the review form — interactive `StarRating` (hover preview + labels) + a fully rebranded review page (card, back link, branded button). ✅
- [x] **Mark-notification-read-on-click** — each notification is now a clickable row (`markRead` action) that clears its unread state and opens its booking if it has one. ✅
- [x] **"Book again" prefill** — the existing Book-again button now passes `?hours=&area=` and `/book` prefills the estimator hours + area select (validated; address never in the URL). ✅
- [ ] Cleaner payout system (Stripe Connect) — LARGE; founder decision (log rationale; needs Stripe Connect setup → likely partly [blocked]).

## P2 — From ideation (2026-06-27 backlog refresh)
- [x] **Booking special instructions**: `bookings.notes` + `request_booking` `p_notes` (migration `0022`, applied + verified). Optional textarea on `/book`; shown to the cleaner on the job page after the deposit is paid (same gate as the address). ✅
- [x] **Favorite cleaners — phase 1**: heart toggle on the booking page activates the stranded `customer_favorites` table (RLS-scoped insert/delete). ✅
- [x] **Favorites — phase 2a**: a "Favorite cleaners" list on the account page (name · ⭐rating · verified · jobs) with a one-tap remove (`removeFavorite`). ✅
- [x] **Favorites — phase 2b: book-a-favorite**: `request_booking` gains an optional `p_preferred_cleaner` (migration `0021`, applied + verified) — rings only that favorite if eligible, else broadcasts. `/book` shows a "Cleaner" select (favorites) when the customer has any. ✅
- [x] **Booking-form crash fix**: validation failures now show inline (the form is a client `BookingForm` with `useActionState`) instead of throwing to the error boundary; inputs preserved, pending state on submit. ✅
- [x] **Saved addresses**: `saved_addresses` table (migration `0018`, RLS-scoped, applied + verified) + account CRUD (add/delete, optional label) + a JS-free `<datalist>` autocomplete on the `/book` address field. ✅
- [x] **Cleaner "Today"/schedule view**: my-jobs now grouped into Today / Upcoming / Earlier (by `scheduled_at`) with per-group counts. ✅
- [x] **Two-way reviews**: `customer_reviews` table + `get_customer_rating` RPC (migration `0020`, applied + verified). The assigned cleaner can rate the customer/property after a finished job (reuses the StarRating UI); the customer's overall rating shows on the job. **Admin customer profile** now shows the customer's rating + the reviews cleaners left (also fixed its stale `pending`/`confirmed` status-color map). ✅
- [x] **Reschedule a booking** before deposit → migration `0031` (APPLIED + verified live): `reschedule_booking(booking, scheduled_at)` SECURITY DEFINER RPC validates owner + pre-deposit status (broadcasting/accepted/no_cleaner_found) + a ≥15-min-future time, moves `scheduled_at`, resets the match (clears offers, nulls cleaner/deposit_deadline), re-rings matching cleaners for the new time (same logic as rebroadcast_booking), and releases+notifies any previously-accepted cleaner. New `reschedule-actions.ts` (parses the datetime-local as Pacific, redirects with a banner on error) + a "Reschedule this booking" disclosure on the booking page (shown pre-deposit) with a success notice. ✅ tsc+build+tests green. (`0031`, `bookings/[id]/reschedule-actions.ts`, `bookings/[id]/page.tsx`)

- [x] **Cleaning scope / checklist on a booking** (IDEAS batch 0 #1) → migration `0032` (APPLIED + verified live): `bookings.checklist text[]` + 7th `request_booking` param `p_checklist` (DEFAULT NULL, empty→NULL; old 6-arg dropped). New `src/lib/checklist.ts` (canonical Rooms/Tasks/Deep-clean taxonomy + `sanitizeChecklist` server-side validator + `checklistLabels`). `/book` shows a "What should we focus on?" `checkbox-card` group (optional); the customer booking page shows a "Cleaning focus" chip card; the cleaner job page shows the same, gated behind `deposit_paid+` (like address+notes). Turns a vague "3 hours" into a shared definition of done → fewer disputes. ✅ tsc + build + tests (30→39) green. (`0032`, `lib/checklist.ts`, `book/BookingForm.tsx`, `book/actions.ts`, `bookings/[id]/page.tsx`, `cleaner/jobs/[id]/page.tsx`, `tests/lib/checklist.test.ts`)

- [x] **Cleaner time off (block specific dates)** (IDEAS batch 3 #5) → migration `0033` (APPLIED + verified live): `cleaner_time_off` table (RLS: cleaner manages own rows) + `request_booking` now excludes a cleaner whose blocked `off_date` equals the booking's **Pacific** service date, in both the preferred-cleaner and broadcast branches. Fully additive (no rows = always eligible; verified the seeded Courtenay roster still matches 3). Cleaner UI: a "Time off" card on `/cleaner/jobs` (add a date, remove a date as a chip) via new `addTimeOff`/`removeTimeOff` actions (Pacific "today" min, idempotent upsert). Improves match quality + cuts wasted offers. ✅ tsc + build + tests green. *(Follow-up: `reschedule_booking`/`rebroadcast_booking` re-ring on a new date without the time-off filter yet — low impact, cleaner can decline.)* (`0033`, `cleaner/actions.ts`, `cleaner/jobs/page.tsx`)

- [x] **PWA installability** (IDEAS batch 1 #6, install half) → `app/manifest.ts` (standalone, brand-dark theme, categories), generated icons (`/icons/192`, `/icons/512` incl. maskable + `apple-icon`, all from a shared asset-free `lib/brand-mark.tsx`), `viewport.themeColor` + `appleWebApp` metadata. Makes the app installable ("Add to Home Screen") on phones — matters for this mobile-first marketplace. No DB, no secrets. *(Web push — the other half — still needs founder VAPID keys.)* ✅ tsc + build (manifest/icons compiled) + tests green. (`app/manifest.ts`, `app/icons/{192,512}/route.tsx`, `app/apple-icon.tsx`, `lib/brand-mark.tsx`, `app/layout.tsx`)

## P3 — Polish / nice-to-have
- [x] **Cleaner "About me" bio** (IDEAS batch 0/feature) → migration `0035` (APPLIED + verified live): `cleaner_details.bio` (cleaner edits it on their profile via existing RLS) + a tiny `get_cleaner_bio(uuid)` SECURITY DEFINER reader so customers can see it without direct `cleaner_details` access (mirrors `get_cleaner_card`). Shown as an "About <name>" card on the booking cleaner card. A trust signal — "who's coming into my home?". ✅ tsc + build + tests green. (`0035`, `cleaner/profile/{page,actions}.tsx`, `bookings/[id]/page.tsx`)
- [x] **Cleaner specialties / tags** (IDEAS batch 6 #1) → migration `0036` (APPLIED + verified live): `cleaner_details.specialties text[]` + `get_cleaner_specialties(uuid)` SECURITY DEFINER reader (mirrors `get_cleaner_bio`). New `src/lib/specialties.ts` (canonical taxonomy + `sanitizeSpecialties` + `specialtyLabels`, +5 tests). Cleaner picks them as `checkbox-card`s on their profile (saved via RLS); shown as chips in the "About <name>" card on the booking page. Trust + future filtering. ✅ tsc + build + tests (39→44) green. (`0036`, `lib/specialties.ts`, `cleaner/profile/{page,actions}.tsx`, `bookings/[id]/page.tsx`, `tests/lib/specialties.test.ts`)
- [x] **Cleaner bio/specialties on the admin cleaner detail page** (IDEAS batch 8 #1) → the admin cleaner profile card now shows the "About" bio + specialty chips (admin reads `cleaner_details` directly; added `bio, specialties` to the select). Ops can see a cleaner's self-presentation at a glance. Code-only, no migration. ✅ tsc + build + tests green. (`admin/cleaners/[id]/page.tsx`)
- [x] **Specialty chips on the customer favorites list** (IDEAS batch 8 #2) → each favorite on the account page now shows up to 3 specialty chips (+N more) via `get_cleaner_specialties`, so customers remember why they favorited a cleaner. Code-only, no migration. ✅ tsc + build + tests green. (`account/page.tsx`)
- [x] **"Book" button on each favorite + `/book?cleaner=` prefill** (IDEAS batch 9 #1) → each favorite on the account page has a "Book" button linking to `/book?cleaner=<id>`; `/book` validates the param against the customer's favorites and preselects that cleaner in the existing "Cleaner" dropdown (`prefillCleaner`). One-tap rebook a trusted cleaner. Code-only, no migration. ✅ tsc + build + tests green. (`account/page.tsx`, `book/page.tsx`, `book/BookingForm.tsx`)
- [x] **Cleaner profile preview ("how customers see you")** (IDEAS batch 9 #2) → a read-only card on the cleaner profile sidebar mirroring the customer-facing booking card (avatar, name, ID-verified badge, jobs, rating from `get_cleaner_card`, plus the saved bio + specialty chips), with a prompt to fill it in when empty. Motivates profile polish. Code-only, no migration. ✅ tsc + build + tests green. (`cleaner/profile/page.tsx`)
- [x] **Admin bookings search by customer/cleaner name** (IDEAS batch 10 #1) → the bookings `q` filter now matches area **or** customer name **or** cleaner name (shared `bookingMatchesQuery` in `lib/admin-bookings`, applied in JS after fetch since PostgREST can't OR across two embedded profiles; same predicate in the CSV export so "export what you see" holds). +5 unit tests. Code-only, no migration. ✅ tsc + build + tests (44→49) green. (`lib/admin-bookings.ts`, `admin/bookings/page.tsx`, `admin/bookings/export/route.ts`, `tests/lib/admin-bookings.test.ts`)
- [x] **Printable receipt view for a paid booking** (IDEAS batch 10 #2) → `/bookings/[id]/receipt` — a clean, paper-style receipt (branded header, billed-to/service/scheduled meta, itemized payments, Net paid) RLS-scoped to the customer's own booking, with a "Print / Save as PDF" button (`window.print()`). Added a global `@media print` rule that drops the `nav`/`footer`/`.print-hide` chrome + the body gradient so it prints clean, and a "View printable receipt" link in the booking Payments section. Code-only, no migration. ✅ tsc + build (route compiled) + tests green. (`bookings/[id]/receipt/{page,PrintButton}.tsx`, `globals.css`, `bookings/[id]/page.tsx`)
- [~] **Bio/rating/specialties on the live-map winner reveal** (IDEAS batch 7 #2) — **deferred (low value):** the static "About <name>" card on the same booking page already shows bio + specialties once a winner exists, so the map winner card would be redundant; and `get_booking_matching` intentionally doesn't expose `cleaner_id`, so a true realtime-reveal fetch would need a privacy-surface change to that RPC. Not worth the churn vs. value.
- [x] **Cleaner weekly recurring availability (work days)** (IDEAS batch 6 #6) → migration `0037` (APPLIED + verified live): `cleaner_details.work_days int[]` (Postgres DOW 0–6) + `request_booking` recreated to also skip a cleaner whose `work_days` don't include the booking's **Pacific** weekday (both match branches; preserves the 0033 checklist + time-off logic). New `src/lib/weekdays.ts` (taxonomy + `sanitizeWorkDays`/`workDayLabels`, +6 tests). Cleaner picks days as checkbox-cards on their profile (NULL/empty = available any day — backward compatible; verified the seeded roster still matches). Improves match quality alongside time-off. ✅ tsc + build + tests (49→55) green. (`0037`, `lib/weekdays.ts`, `cleaner/profile/{page,actions}.tsx`, `tests/lib/weekdays.test.ts`)
- [x] **Work-days honoured on reschedule/rebroadcast** → migration `0038` (APPLIED + verified live): recreated `rebroadcast_booking` + `reschedule_booking` with the `work_days` weekday filter (on top of the 0034 time-off filter) — rebroadcast resolves the weekday from `b.scheduled_at`, reschedule from the new `p_scheduled_at`. Verified both functions now carry **both** filters. The cleaner availability system (time-off + work-days) is now consistent across all three dispatch paths (request/rebroadcast/reschedule). RPC-only, no app code. ✅ tsc + build + tests green. (`0038`)
- [x] **a11y: aria-live on the cleaner live job feed** (IDEAS batch 11 #1) → an `sr-only` `role="status" aria-live="polite"` line in the Job-requests header announces the open-request count ("3 open job requests") so screen-reader cleaners hear it change as `JobsLive` refreshes in real time. Code-only, no migration. ✅ tsc + build + tests green. (`cleaner/jobs/page.tsx`)
- [x] **Perf: parallelize independent reads on the cleaner jobs page** (IDEAS batch 11 #2) → the four independent leading reads (availability, time-off, 7-day activity, open offers) now run in one `Promise.all` instead of four sequential remote round-trips. The expiry RPCs → my-jobs ordering is deliberately preserved (my-jobs still read after the lazy expiries so a just-expired job doesn't linger). Pure read reordering, no behaviour change. Code-only, no migration. ✅ tsc + build + tests green. (`cleaner/jobs/page.tsx`)
- [x] **Perf: parallelize the customer booking page reads** (IDEAS batch 12 #1) → the two lazy-expiry RPCs now run as one `Promise.all` (independent, different states) before the booking read, and the four cleaner-cluster reads (card + bio + specialties + favorite) — all keyed only on the cleaner id — now run concurrently instead of four serial calls. Booking-first ordering preserved; pure read reordering, no behaviour change. Code-only, no migration. ✅ tsc + build + tests green. (`bookings/[id]/page.tsx`)
- [x] **Perf: parallelize the cleaner job detail page reads** (IDEAS batch 12 #2) → after the booking read, messages + (when reviewable) the existing-review check + the customer rating now run in one `Promise.all` (conditional reads fall back to a resolved `{data:null}`) instead of three serial round-trips. Pure read reordering, no behaviour change. Code-only, no migration. ✅ tsc + build + tests green. (`cleaner/jobs/[id]/page.tsx`)

> 🟢 **2026-06-30 — founder granted product-owner latitude** ("do what seems fit…
> decide what improvement to bring"). So the Knight now takes on the larger,
> ambitious-but-grounded features it had been deferring (not just small polish).

## P-MAJOR — Big features (founder-approved product-owner initiative)
- [x] **Recurring bookings** ⭐ → migration `0039` (APPLIED + verified live):
  `recurring_series` table (RLS owner-scoped) + `bookings.series_id` + two RPCs —
  `create_recurring_series` (creates the series + first occurrence via
  `request_booking`) and `generate_due_recurring` (lazy, cron-free: ensures the
  next occurrence within a 10-day lead window, guarded against duplicates/runaway
  by an "no live booking for series" check + a bounded roll-forward; missed dates
  skipped, not back-filled). Each occurrence is a normal booking paid per the
  existing deposit/balance flow — **nothing founder-gated** (no auto-charge/saved
  cards). UI: a "Repeat" select on `/book` (one-time / 1 / 2 / 4 weeks); `/bookings`
  generates due occurrences on load + shows a "Recurring" badge; the account page
  lists active plans with a "Stop" action. New `lib/recurring.ts` (+5 tests). The
  retention/predictable-revenue engine for a cleaning marketplace. ✅ tsc + build +
  tests (55→60) green. (`0039`, `lib/recurring.ts`, `book/*`, `bookings/page.tsx`,
  `account/*`, `tests/lib/recurring.test.ts`)
- [x] **Referral / first-clean discount** ⭐ → migration `0040` (APPLIED + verified
  live): `promo_codes` table (percent/amount, optional expiry / max-uses /
  first-clean-only; admin-RLS) + `bookings.discount_amount`/`promo_code` +
  `validate_promo(code)` (read-only preview) + `request_booking` recreated with
  `p_promo_code` and a **platform-absorbs** discount model — the discount reduces
  what the customer pays but the cleaner's payout is computed on the full
  pre-discount total, so a marketing promo NEVER cuts a cleaner's pay (honest-money
  aligned); the platform funds it (`platform_fee = discounted_total − payout`).
  **Money math functionally tested in a rolled-back txn** (WELCOME15 on a $60 clean
  → customer $51, cleaner $51, platform $0 — PASS). UI: a promo field on `/book`
  (validated inline; one-time bookings only), discount shown on the booking page +
  receipt. Seeded `WELCOME15` (15%) + `FIRST20` ($20, first-clean). New
  `lib/promo.ts` (+2 tests, suite 60→62). ✅ tsc + build + tests green.
  (`0040`, `lib/promo.ts`, `book/*`, `bookings/[id]/page.tsx`, `…/receipt/page.tsx`)
- [x] **Promo-code admin UI** (follow-up to 0040) → `/admin/promos` — admin page to
  create codes (code, percent/amount + value, optional max-uses & expiry,
  first-clean-only), see usage (`used / max`, expiry, status), and activate/
  deactivate. Server actions via the admin RLS (no service key); validated inputs +
  friendly duplicate/error banner; dashboard nav card added. ✅ tsc + build (route
  compiled) + tests green. (`admin/promos/{page,actions}.tsx`, `admin/page.tsx`)
- [x] **Recurring plan lifecycle (pause / resume / remove)** → the account page now
  lists active **and** paused plans; Pause stops generating new visits (vacation),
  Resume restarts, Remove deletes the plan — all RLS-owner-scoped. Completes the
  recurring feature (was one-way "Stop" only). ✅ tsc + build + tests green.
  (`account/{page,actions}.tsx`)
- [ ] **Before/after photos** (big P-MAJOR) — cleaner uploads job photos (Supabase
  Storage; bucket + storage.objects RLS creatable via the pooler) shown to the
  customer as proof. Trust + dispute evidence. **⚠️ Deferred on the unattended loop:**
  the browser upload flow can't be verified from here and it handles privacy-
  sensitive home photos with path-scoped storage RLS — best built when the founder
  can smoke-test the upload (or build defensively + flag for a founder smoke-test).
- [x] **Cleaner "on my way / running late" status** (IDEAS batch 13) → an "Update
  the customer" card on the cleaner job page (deposit_paid/in_progress) with two
  one-tap buttons that send the customer an in-app notification ("on the way" /
  "running ~15 min late") via the service-role `createNotification` (re-checks
  cleaner ownership + status; new `cleaner_update` type, in-app only). Reduces
  day-of anxiety/no-access. ✅ tsc + build + tests green. (`cleaner/jobs/[id]/arrival-actions.ts`, `cleaner/jobs/[id]/page.tsx`)
- [x] **Admin promo-usage report** (IDEAS batch 13 #3) → a "Recent redemptions"
  table on `/admin/promos` (code · customer · discount · date · booking link) + a
  header summary (N uses · $ total discounted). Read-only; admin RLS on bookings.
  Marketing visibility into the promo feature. ✅ tsc + build + tests green.
  (`admin/promos/page.tsx`)
- [x] **Service add-ons / paid extras** ⭐ → migration `0042` (APPLIED + verified
  live): `service_addons` menu (admin-RLS; seeded inside fridge/oven $25, interior
  windows $30, laundry $20) + `booking_addons` snapshot (label+price at booking
  time) + `request_booking` recreated with `p_addons` (9th arg): `total = base +
  add-ons`, cleaner payout on the FULL total (they do the extra work), promo +
  commission then apply (consistent with 0040). **Pricing functionally tested in a
  rolled-back txn** (3h + fridge $25 + windows $30 = $115; deposit $69; payout
  $97.75; 2 snapshot rows — PASS). UI: add-on checkbox cards in the live
  `PriceEstimator` (total updates), shown on the booking page payment card +
  cleaner job page (after deposit). Promo/add-ons one-time only. AOV upsell. ✅
  tsc + build + tests green. (`0042`, `book/{page,BookingForm,PriceEstimator,actions}`,
  `bookings/[id]/page.tsx`, `cleaner/jobs/[id]/page.tsx`)
- [x] **Admin add-ons CRUD** (follow-up to 0042) → `/admin/addons` — admin page to
  create add-ons (label, key, price, sort) and activate/deactivate, mirroring the
  promo admin page. Server actions via the admin RLS (no service key); validated
  inputs + friendly duplicate banner; dashboard nav card added. The paid-extras
  menu is now fully self-serve. ✅ tsc + build (route compiled) + tests green.
  (`admin/addons/{page,actions}.tsx`, `admin/page.tsx`)
- [x] **Admin bookings/revenue trend** (IDEAS batch 14) → a "Last 8 weeks" mini bar
  chart on the admin dashboard — bookings created per rolling 7-day window (bars,
  CSS only, no lib), each bar's revenue on hover, with an 8-week total header.
  Reuses the existing payments/bookings fetches (added `created_at`). Read-only.
  ✅ tsc + build + tests green. (`admin/page.tsx`)
- [x] **Add-on line items on the printable receipt** (IDEAS batch 15) → the receipt
  now itemizes each paid add-on (label · price) in its own "Add-ons" block above
  the payments (the total already includes them). Code-only. ✅ tsc + build + tests
  green. (`bookings/[id]/receipt/page.tsx`)
- [x] **Add-ons on recurring series** (IDEAS batch 15) → migration `0043` (APPLIED +
  verified live): `recurring_series.addons` + `create_recurring_series` (9th param
  `p_addons`) + `generate_due_recurring` recreated to pass the series' add-ons to
  every occurrence (via `request_booking` named args, so promo stays default-NULL).
  `/book` now allows add-ons on recurring (promo still one-time). **Verified in a
  rolled-back txn** (weekly + interior windows → first booking $90, add-on row,
  series.addons stored — PASS). ✅ tsc + build + tests green. (`0043`, `book/actions.ts`)
- [x] **Skip the next recurring visit** (IDEAS batch 13) → migration `0041`
  (APPLIED + verified live): `skip_next_occurrence(series)` cancels the upcoming
  not-yet-committed booking (offers cleared; no deposit = no refund) and advances
  `next_at` past the skipped slot to the following occurrence. Owner-only. A "Skip
  next" button on the account recurring list (active plans). **Functionally tested
  in a rolled-back txn** (visit cancelled, offers 0, next_at → +1 period — PASS).
  ✅ tsc + build + tests green. (`0041`, `account/{page,actions}.tsx`)

## ⛔ Founder-only / blocked
> Highest leverage: add `STRIPE_WEBHOOK_SECRET` + Stripe live keys, deploy to
> Vercel (set `NEXT_PUBLIC_BASE_URL`), add Resend/Twilio keys (email/SMS channel is
> built), Stripe Connect (tips/payouts), real ID verification, rate-limit thresholds.
- [x] **Customer "what to expect" pre-arrival card** (IDEAS batch 6 #2) → a "Getting ready for your clean" checklist on the booking page (secure pets, parking/access, put away valuables, cleaner brings supplies, watch chat), shown once a cleaner is matched and the job is upcoming/ongoing (`accepted`/`deposit_paid`/`in_progress`). Reduces day-of access hiccups & no-shows. Code-only, no migration. ✅ tsc + build + tests green. (`bookings/[id]/page.tsx`)
- [x] **Show the customer's rating on the cleaner's offer card** (IDEAS batch 6 #3) → each open-offer card on `/cleaner/jobs` now shows "Customer: ⭐ X.X (N)" (or "New customer") from `get_customer_rating` (SECURITY DEFINER; fetched per unique offer customer via Promise.all — the offer list is small). Added `customer_id` to the offers query. Lets a cleaner accept informed (two-way reviews). Code-only, no migration. ✅ tsc + build + tests green. (`cleaner/jobs/page.tsx`)
- [x] **Cleaner onboarding completeness meter** (IDEAS batch 6 #4) → a "Profile completeness" card on the cleaner profile sidebar with a % bar + a checklist of what's missing (name, phone, areas, About me), or a "looks great" state at 100%. Nudges cleaners to finish a credible, bookable profile. Code-only, no migration. ✅ tsc + build + tests green. (`cleaner/profile/page.tsx`)
- [x] **Add-to-calendar (.ics) for a confirmed booking** (IDEAS batch 7 #1) → `GET /bookings/[id]/calendar` streams an RFC-5545 `.ics` (escaped fields, UTC stamps, start + hours duration, location = address if RLS-readable else area, link back). RLS-aware: served only to the booking's customer or assigned cleaner. "Add to calendar" links on the customer booking page + the cleaner job page (shown for `accepted`/`deposit_paid`/`in_progress`). Reduces no-shows on both sides. Code-only, no migration. ✅ tsc + build (route compiled) + tests green. (`bookings/[id]/calendar/route.ts`, `bookings/[id]/page.tsx`, `cleaner/jobs/[id]/page.tsx`)
- [x] **Cleaner earnings period summary** (IDEAS batch 7 #3) → two rolling net-earnings stat cards ("Last 7 days", "Last 30 days") with job counts, below the all-time summary on the earnings page (by job date, using the same stored-payout math). Shows momentum, not just an all-time total. Code-only, no migration. ✅ tsc + build + tests green. (`cleaner/earnings/page.tsx`)
- [x] **Cleaner-side deposit-deadline visibility** (IDEAS batch 5 #1) → on accepted (awaiting-deposit) jobs the cleaner now sees "Awaiting the customer's deposit — they must confirm by <Pacific date/time> or this slot is released", on both `/cleaner/jobs` (job card) and the job-detail customer card. Mirrors the customer-side 0029 deadline so the cleaner knows when a held slot may free up. Display-only, no migration. ✅ tsc + build + tests green. (`cleaner/jobs/page.tsx`, `cleaner/jobs/[id]/page.tsx`)
- [x] **Reschedule / rebroadcast respect `cleaner_time_off`** (IDEAS batch 5 #2) → migration `0034` (APPLIED + verified live): recreated `rebroadcast_booking` (0025) + `reschedule_booking` (0031) with the same `not exists (cleaner_time_off … = Pacific service date)` filter as `request_booking` (0033) — rebroadcast resolves the date from `b.scheduled_at`, reschedule from the new `p_scheduled_at`. Verified both bodies now reference `cleaner_time_off` and eligibility is unchanged (3 Courtenay cleaners, no time-off). RPC-only, no app code change. Closes the 0033 follow-up. ✅ tsc + build + tests green. (`0034`)
- [x] **Demand / activity indicator for cleaners** (IDEAS batch 5 #3) → a read-only "Last 7 days" card on `/cleaner/jobs` showing Requests / Accepted / Accept-rate from the cleaner's own `booking_offers` in the window (RLS-scoped, one offer per eligible booking), with a friendly "stay online" nudge when there were none. No schema change. ✅ tsc + build + tests green. (`cleaner/jobs/page.tsx`)
- [x] **Deposit/balance split bar** on the customer booking page (IDEAS batch 5 #4) → a two-segment emerald bar under the Payment card showing the deposit vs balance % (always sum to 100), with a labelled legend + `role="img"` aria-label. Display-only, no migration. ✅ tsc + build + tests green. (`bookings/[id]/page.tsx`)
- [~] **Saved-address picker on the reschedule form** (IDEAS batch 5 #5) — **dropped**: reschedule only changes date/time (no address field), so there's nothing to autocomplete. Not worth adding an address edit to reschedule.
- [x] **Skip-to-content link** in the layout (sr-only until focused → jumps to `#main-content`). ✅
- [x] a11y: live status/notification updates → the booking status sentence is now a `role="status" aria-live="polite"` region, so SR users hear status changes (cleaner found, deposit paid, completed) when StatusLive refreshes. Decorative nav icons (Bell ×2, Menu, X) are `aria-hidden` (their controls already carry `aria-label`). Most page-level decorative icons already got `aria-hidden` during the UI redesign. ✅ tsc+build+tests green. (`bookings/[id]/page.tsx`, `NavClient.tsx`)
- [x] Offer card: live **expiry countdown** (`Countdown` client component, from `broadcast_expires_at`) + the cleaner's **take-home** (`cleaner_payout`) shown as the headline amount with the gross as subtext. ✅
- [x] **CI workflow** (`.github/workflows/ci.yml`) — typecheck + unit tests + production build on push/PR (dummy env so build needs no secrets); pinned Node `engines` (>=20). ✅
- [x] Expand test coverage: pure `src/lib/booking.ts` now holds the refund-window logic AND `validateBooking` (booking input validation), both extracted from their server actions and covered by boundary tests. Suite: **15 tests / 2 files**. ✅
- [x] **SEO: LocalBusiness JSON-LD** structured data on the landing page (`HomeAndConstructionBusiness` — name, description, url, image, email, priceRange, serviceType, areaServed Courtenay/Comox/Cumberland/Comox Valley, BC address). Code-only + invisible; improves local search / rich results. ✅ tsc+build+tests green. (`app/page.tsx`)
- [x] **Cleaner earnings CSV export** → `GET /cleaner/earnings/export` route streams the cleaner's completed/paid/closed jobs as a CSV (date, area, hours, gross, platform fee, net payout, status) with a UTF-8 BOM + attachment headers; RLS-scoped to the signed-in cleaner, mirrors the earnings-page payout math. "Export CSV" button added to the earnings header (shown when there are jobs). ✅ tsc+build+tests green. (`cleaner/earnings/export/route.ts`, `cleaner/earnings/page.tsx`)
- [x] **Admin bookings date-range filter** → the bookings list now takes `from`/`to` date inputs (JS-free GET, validated YYYY-MM-DD) that filter `scheduled_at` server-side (inclusive of the whole "to" day); the subtitle reflects the active range. Combines with the existing area + status filters. ✅ tsc+build+tests green. (`admin/bookings/page.tsx`)
- [x] **Chat message report / abuse flag** → migration `0030` (APPLIED + verified live): `message_reports` table + RLS (admin/own select) + `report_message(message_id, reason)` SECURITY DEFINER RPC that validates the caller participates in the message's booking. Both chat panels (customer + cleaner) get a per-message "Report" flag button (incoming messages, confirm + fail-safe). New admin `/admin/reports` moderation page (open reports with message body, reporter, booking link; Mark reviewed / Dismiss) + a dashboard nav card. ✅ tsc+build+tests green. (`0030`, `components/MessagePanel.tsx`, `bookings/[id]/MessagePanel.tsx`, `admin/reports/*`, `admin/page.tsx`)
- [x] **Admin bookings CSV export** → `GET /admin/bookings/export` streams the bookings list as CSV (ID, created, scheduled, status, area, customer, cleaner, hours, total), honouring the same q/status/from/to filters as the page; "Export CSV" button on the list carries the active filters (UTF-8 BOM, attachment). ✅ tsc+build+tests green. (IDEAS batch 3) (`admin/bookings/export/route.ts`, `admin/bookings/page.tsx`)
- [x] **Cleaner "Get directions" link** → the job-detail service-address card now has a "Get directions" link opening a Google Maps universal link (`maps/search/?api=1&query=<address>`) in a new tab — works on desktop + opens the Maps app on mobile. Only renders when the address is revealed (deposit_paid+). ✅ tsc+build+tests green. (`cleaner/jobs/[id]/page.tsx`)
- [x] **Admin "this month vs all-time" revenue** → the dashboard Revenue card now shows all-time total as the headline with a "$X this month" sub (sum of paid, non-refund payments with `paid_at` in the current UTC calendar month). ✅ tsc+build+tests green. (`admin/page.tsx`)
- [x] **More unit coverage** — added `tests/lib/status.test.ts` (bookingBadgeClass tones, bookingStatusLabel short labels + fallback, paymentBadgeClass, every status has a label) and `tests/lib/messaging.test.ts` (isEmailConfigured/isSmsConfigured gating — the safe-no-op guards). Suite 20 → 30 across 4 files. Pure, no app change. ✅ tsc+build+tests green. (`tests/lib/status.test.ts`, `tests/lib/messaging.test.ts`)
- [x] **Deposit-deadline urgency on the booking detail** — when a booking is awaiting deposit, the pay section now shows "Reserve your slot — pay by <Pacific date/time> or it may be released", surfacing the 0029 `deposit_deadline` so customers don't lose the slot to auto-expiry. Display-only. ✅ tsc+build+tests green. (`bookings/[id]/page.tsx`)
- [x] **Admin customers/cleaners CSV export** → `GET /admin/customers/export` (name, phone, joined, bookings, total spent) and `GET /admin/cleaners/export` (name, phone, verified, active, areas served), both honouring the list `q` filter, with "Export CSV" buttons on each list page. UTF-8 BOM + attachment; RLS via admin client. ✅ tsc+build+tests green. (IDEAS batch 4) (`admin/customers/export/route.ts`, `admin/cleaners/export/route.ts`, list pages)
- [ ] `vercel.json`; image optimization `remotePatterns` for Supabase storage. (defer remotePatterns until image uploads exist — no remote images today)
- [ ] Static generation/revalidation for marketing pages. (constrained: the global Nav reads auth cookies in the root layout, forcing dynamic render — needs a split layout first)

## ⛔ Founder-only (cannot automate — log, don't attempt)
- Stripe live keys + `STRIPE_WEBHOOK_SECRET`; `NEXT_PUBLIC_BASE_URL` real URL; Vercel deploy; rotate Supabase service-role key + DB password.
