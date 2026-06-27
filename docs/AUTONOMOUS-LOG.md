# 🛡️ Autonomous Knight — Progress Log

Newest entries at the top. The founder reads this to see what happened while away.
Operating procedure: `AUTONOMOUS-KNIGHT.md`. Backlog: `AUTONOMOUS-PLAN.md`.

---

## 2026-06-27 — Knight iteration: admin list search/filter

- **Item:** P2 admin usability. The customers/cleaners/bookings lists had no way
  to find a record. Added a shared JS-free `AdminSearch` (GET form): customers +
  cleaners search by name/phone (`.or(name.ilike, phone.ilike)`); bookings search
  by area + a **status filter dropdown** (real enum values). Filters are
  shareable/bookmarkable via `?q=`/`?status=`.
- Also fixed the **bookings list's stale `pending`/`confirmed` status-color map**
  → real `booking_status` values (same bug previously fixed on the dashboard, in
  this separate file).
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 27/27. ✅
- **Next:** payment receipts / star-rating review UI / README + .env.example /
  mark-notification-read-on-click.

---

## 2026-06-27 — Knight iteration: Open Graph / social metadata

- **Item:** P2 SEO/sharing. The app had only a bare title/description and the
  build warned that `metadataBase` was unset (OG/canonical URLs resolved to
  localhost). Added in `layout.tsx`: `metadataBase` (from NEXT_PUBLIC_BASE_URL),
  a title template `%s · Dust Busters`, keywords, and full Open Graph + Twitter
  (`summary_large_image`) metadata. Added an **asset-free branded OG image** via
  `next/og` `ImageResponse` (`opengraph-image.tsx`, reused by `twitter-image.tsx`)
  — dark card with the brand + tagline. Per-page titles on /about and /book.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 27/27 (the og/twitter
  image routes added) — **no more metadataBase warning**. ✅
- **Next:** admin search/filter on lists, then payment receipts / star-rating
  review UI / README + .env.example.

---

## 2026-06-27 — 🏁 SVG fallback basemap + 📊 Milestone summary

**This iteration:** SVG fallback basemap. `SvgBasemap.tsx` renders a stylized
dark map (projected pins + coverage rings + customer centre) when the real tiles
fail — `LeafletBasemap` reports failure (≥4 tileerrors before any load, or 6s
with no tile loaded) and `MatchingMap` swaps to it. The map is never a broken gray
box now. Verify: tsc clean · vitest 3/3 · next build 25/25. ✅

### 📊 Milestone summary (now ~20 items shipped since session start)
Since the 8-item milestone, all verified + (DB items) applied live:
- /book live estimate + validation · admin schema-mismatch cluster · error
  boundaries + 404 · security headers · **22 route loading skeletons**.
- 🎯 **Flagship Uber-style live cleaner map — COMPLETE end-to-end:** geo+fuzzing
  RPC (0016) · visible dark CARTO map · fuzzed pulsing pins + radar · live counts ·
  realtime instant winner reveal · cancel-search · re-broadcast (0017) · SVG
  fallback basemap.
- Founder-requested visual work: full-page dark/futuristic landing redesign +
  **council-driven unified background fix** (one cohesive #070b14 surface).

**Remaining backlog:** P2 — OG/social metadata + metadataBase, admin search/filter,
payment receipts, star-rating review UI, README + .env.example, mark-notification-
read-on-click; P3 polish (a11y skip-link, CI, vercel.json). **Founder-gated P0s
still open:** dispatch cron, real ID verification, transactional email/SMS keys,
+ launch steps (Stripe live keys/webhook secret, NEXT_PUBLIC_BASE_URL, Vercel
deploy, rotate service-role key + DB password).

---

## 2026-06-27 — Knight iteration: re-broadcast on no_cleaner_found

- **Item:** flagship flow completion. A booking that ended `no_cleaner_found` was
  a dead end. Migration `0017` adds `rebroadcast_booking(booking_id)` (SECURITY
  DEFINER, owner/admin only): clears the stale offers, re-rings every matching
  available/verified cleaner, and reopens the search (status→broadcasting +
  fresh broadcast window); stays no_cleaner_found if still nobody. Added a
  "Search again" button on the map's no-cleaner state (`rebroadcast-actions.ts`).
- **DB:** 0017 applied via pooler, verified. (Note: had to re-add the `pg` dev
  dep with `npm i pg --no-save` — the earlier leaflet install pruned it; logged
  so future firings know.)
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25. ✅
- **Next:** SVG fallback basemap on tile failure, then P2 (OG metadata, admin
  search/filter, receipts, star-rating review UI, README/.env.example).

---

## 2026-06-27 — Council fix: unified, consistent landing background

- **Founder report:** homepage background looked inconsistent (patchy / banded /
  shifting tone). Ran a 4-agent "council" (CSS cascade · component overlays ·
  top-to-bottom stack · synthesis).
- **Root cause:** the landing was 7 independently-painted surfaces. A prior
  "seamless fix" flattened only 4 of 7, leaving: the **hero's opaque off-palette
  teal `#122` base** (the most-visible region, a different hue than `#070b14`),
  Pricing's top emerald wash + CTA's bottom wash at **different opacities**,
  ambient glows at **5 different opacities (0.4–0.5)**, all corner glows stacked
  on the **same edges** (left-edge diagonal ladder), extra bookend auroras +
  edge-fades on hero/CTA, and a **white footer hairline**.
- **Fix (one cohesive `#070b14` surface):** every region base (incl. hero) now
  transparent over `<main>`; all 6 ambient glows normalized to opacity 0.3;
  WhyTrust + ServiceAreas glows flipped so accent sides alternate; removed the
  3rd hero/CTA auroras, the slate `hero-vignette`, the dark `cta-edge`, and the
  footer's white top border (kept its bg).
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25. ✅

---

## 2026-06-27 — Knight iteration: instant winner reveal (map realtime)

- **Item:** flagship map polish round 2a. The map caught a cleaner accepting only
  on its 2.5s poll (the rest of the page already updates instantly via
  `StatusLive`'s realtime `router.refresh()`). Added a Supabase realtime channel
  in `MatchingMap` that refetches `get_booking_matching` the instant THIS booking
  row updates → **immediate winner reveal**. The 2.5s poll is kept for the ambient
  notified/deciding counts + pins (booking_offers isn't customer-readable via
  realtime — RLS — so it can't push those). Channel cleaned up on unmount.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25. ✅
- **Next:** SVG fallback basemap on tile failure + re-broadcast CTA on
  no_cleaner_found, then back to the P2/P3 backlog.

---

## 2026-06-27 — Knight iteration: map polish (dark theme + cancel search)

- **Item:** flagship map polish round 1 (founder asked for "modern graphics").
  - Swapped the basemap to **CARTO Dark Matter** tiles (free, no API key) so the
    map matches the app's dark/futuristic theme — emerald pins + radar pop on the
    dark map. CSP-safe (tiles are https `img-src`).
  - Added a **"Cancel search"** CTA on the map during `broadcasting` (reuses the
    `cancelBooking` server action → cancels + redirects).
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25. ✅
- **Next:** realtime on `bookings` status (instant winner reveal), SVG fallback
  basemap on tile failure, re-broadcast on no_cleaner_found.

---

## 2026-06-27 — 🎯🗺️ FLAGSHIP: the live cleaner map is VISIBLE

The Uber-style map now renders on `/bookings/[id]` during the live search.

- Installed `leaflet@1.9` + `react-leaflet@5` (+ types) — no API key, OSM tiles.
- `matching/LeafletBasemap.tsx` — client-only Leaflet map (imported via
  `dynamic(ssr:false)`, so no server `window` access), `L.divIcon` CSS markers.
- `matching/MatchingMap.tsx` — orchestrator: server-rendered initial data from the
  `get_booking_matching` RPC, then polls every 2.5s; renders the area-centered
  map, fuzzed **pulsing cleaner pins**, a **radar sweep** at the customer centre,
  live "N notified · M deciding" counts, and on accept a **winner reveal** card
  (name, rating, verified). `no_cleaner_found` shows an honest empty state.
- Wired into the booking page (renders while status ∈ broadcasting/accepted/
  no_cleaner_found), above the status header. Added pin/radar/map CSS.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25 — crucially **no
  SSR `window is not defined`** (the dynamic import is correct).
- **Next:** swap polling → Supabase realtime, add an SVG fallback basemap for tile
  failure, and a mid-search cancel CTA / re-broadcast on no_cleaner_found.

---

## 2026-06-27 — 🎯 FLAGSHIP kickoff: Uber map data foundation (migration 0016)

Founder set the live cleaner map as the active priority ("see available cleaners
like Uber cars") and asked the knight to drive the project to completion like a
product owner (added to the playbook mission).

- **Shipped:** migration `0016_live_matching.sql`, applied + verified live:
  - `area_centroids` (3 towns) with RLS read; `cleaner_details.approx_lat/lng`
    (opt-in coarse base); `bookings.broadcast_expires_at` + `settings.broadcast_ttl_mins`
    set by an insert trigger.
  - `fuzz_pin(cleaner, booking, area)` — deterministic synthesized pin in a
    0.6–2.4 km disc around the town centroid; **verified stable + per-booking**
    (no real location exists to recover).
  - `get_booking_matching(booking_id)` SECURITY DEFINER RPC — authorises (owner/
    admin only), returns `{status, center, notified, deciding, expires_at, pins[],
    winner}`; **no cleaner_id / real coords / address ever cross the wire**.
- Also: route-level loading skeletons shipped earlier this session (commit `eec2f0e`).
- **Verify:** migration applied via pooler; fuzz determinism + centroids + column
  presence confirmed. (No TS changes this step.)
- **Next firing:** install `react-leaflet`/`leaflet`, build the SSR-safe
  `MatchingMap` (divIcon pins + radar) and wire it into `/bookings/[id]` for the
  broadcasting state — the visible map.

---

## 2026-06-27 — Knight iteration: security headers

- **Item:** P1 security. `next.config.ts` was empty (no headers). Added a
  `headers()` policy on all routes: HSTS, X-Frame-Options=SAMEORIGIN,
  X-Content-Type-Options=nosniff, Referrer-Policy=strict-origin-when-cross-origin,
  Permissions-Policy (camera/mic off). A Content-Security-Policy is applied
  **production-only** (allows self + Supabase REST/wss + Stripe.js/checkout) so it
  doesn't break the dev server's HMR/eval. Note: CSP can't be runtime-verified
  from here — the founder should sanity-check the deployed app's console for CSP
  violations after first deploy and widen origins if needed.
- Code-only (no migration).
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25. ✅
- **Next up:** P2 — route-level `loading.tsx` skeletons, then OG/social metadata
  (`metadataBase` + per-page titles), then admin search/filter.

---

## 2026-06-27 — Knight iteration: error boundaries + custom 404

- **Item:** P1 resilience. There was no error boundary or custom 404 anywhere, so
  an uncaught render error or bad URL showed a raw Next.js error. Added:
  - `app/error.tsx` — route-segment boundary with Try-again (`reset()`) + Go-home,
    logs the error (Sentry hook point later).
  - `app/global-error.tsx` — root boundary (inline-styled since it replaces the
    layout / global CSS isn't guaranteed), shows the digest ref.
  - `app/not-found.tsx` — branded 404 with a back-home CTA.
- Code-only (no migration).
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25 (`/_not-found`
  generated). ✅
- **Next up:** security headers (CSP/HSTS/X-Frame-Options/Referrer-Policy) in
  `next.config.ts`; then P2 (loading skeletons, OG metadata, admin search/filter).

---

## 2026-06-27 — Knight iteration: admin schema-mismatch bug cluster

- **Item:** P1 admin correctness — three pages were querying columns/tables that
  don't exist, so they silently broke:
  - Cleaner acceptance rate read `.from("offers").select(...status)` → fixed to
    `booking_offers` / `state` (cleaners list + profile).
  - Cleaner profile reviews read `reviews.created_by` and `.eq("cleaner_id")` —
    reviews have neither. Now resolved via the cleaner's booking ids
    (`reviews.in("booking_id", ...)`), and the reviewer name comes from each
    booking's customer. Avg Rating now renders.
  - Admin dashboard: status color map keyed on non-existent `pending`/`confirmed`
    → real `booking_status` values; the active-cleaners count selected
    `cleaner_details.id` (PK is `profile_id`) → fixed; replaced the always-0
    "pending" stat with a real "active" (in-flight) count.
- Code-only (no migration).
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25. ✅
- **Next up:** P1 resilience — `app/error.tsx` + `global-error.tsx`, then security
  headers in `next.config.ts`; then P2 (loading skeletons, OG metadata, etc.).

---

## 2026-06-27 — Knight iteration: /book live estimate + date/input validation

- **Item:** P1 customer-facing booking-form fixes. The price estimate was
  hardcoded to "3 hrs" regardless of input, and past dates were accepted.
  - Added a `PriceEstimator` client component: the hours input now drives a live
    estimated total + deposit-due-today.
  - Date input gets a soft `min` (today); the `submitBooking` server action now
    does authoritative validation — valid + ≥15 min in the future, hours a whole
    1–12, area in the whitelist, address non-empty (no more silent bad bookings).
- Code-only (no migration).
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25. ✅
- **Next up:** admin schema-mismatch bugs (cleaner acceptance-rate `offers` table,
  cleaner-profile `created_by`, dashboard status map), then P2 polish.

---

## 2026-06-26 — 📊 Milestone summary (8 knight items shipped)

**Shipped + applied live, all verified (tsc + build + tests), on `dustbusters-autonomous`:**
1. `0009` security — closed 3 critical RLS holes (privilege escalation, cleaner
   self-verify, notification spoofing).
2. Reviews existence-check fixed (nonexistent `reviewer_id`).
3. `0011` double-booking guard in `accept_offer` (+ index).
4. `0012` cleaner Online/Offline availability toggle.
5. `0013` repaired the admin refund/dispute path (disputes were unresolvable;
   refunds never recorded).
6. Cancellation 24h window + automatic Stripe deposit refunds.
7. `0014` cleaner-side issue reporting (open_dispute now allows the cleaner).
8. `0015` honest commission model — configurable `commission_percent`, real
   `platform_fee`/`cleaner_payout` per booking, truthful payout copy + settings
   validation.

**P0 status:** the security + money-path + safety + matching-correctness P0s are
DONE. Remaining P0s are **founder-gated** (not automatable):
- Dispatch scheduler heartbeat — needs pg_cron enabled or a Vercel cron hitting a
  service-role route (deploy-dependent).
- Real ID verification — needs Supabase Storage bucket / Stripe Identity setup.
- Transactional email/SMS — needs Resend/Twilio API keys.

**Next:** start P2 (route-level loading.tsx, OG/social metadata, search/filter on
admin lists, receipts, star-rating review UI, `.env.example` + real README), and
keep ideating per the loop.

⛔ **Still needs the founder:** apply nothing (migrations auto-applied) — but for
launch: Stripe live keys + `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_BASE_URL`, Vercel
deploy, rotate the service-role key + DB password, and the 3 founder-gated P0s above.

---

## 2026-06-26 — Knight iteration: honest commission / payout model

- **Item:** P0 "Honest money/commission". The 15% fee + "Friday direct deposit"
  was a display-only constant with no payout rail or stored commission. Migration
  `0015` adds `settings.commission_percent` (configurable), stores
  `platform_fee`/`cleaner_payout` on each booking (computed in `request_booking`,
  existing rows backfilled), earnings page now reads the real stored take-home and
  replaces the false Friday-payout promise with honest "payouts not yet automated"
  copy, and admin settings exposes commission % with proper validation (also fixes
  the no-validation P1 bug — no more silent coerce-to-0).
- **DB:** 0015 applied via pooler, verified (commission_percent=15, columns added,
  all bookings backfilled).
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25. ✅

---

## 2026-06-26 — Knight iteration: cleaner-side issue reporting

- **Item:** P0 "Cleaner-side issue reporting". `open_dispute` hard-rejected anyone
  but the customer, so a lone cleaner in a stranger's home couldn't report a
  no-show, unsafe conditions, or harassment. Migration `0014` generalises the
  authorisation to the customer OR the assigned cleaner OR an admin (records
  `raised_by`). Added a collapsible "Report a problem" form (category + details)
  on the cleaner job detail page → `reportProblem` action → same admin dispute
  queue, with a confirmation banner.
- **DB:** 0014 applied via pooler, verified (open_dispute now allows the cleaner).
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25. ✅
- **Next up:** honest commission/payout model (last fully-doable P0; the rest are
  founder-gated: dispatch cron, ID verification, email/SMS keys). Milestone
  summary due next iteration (~8 shipped).

---

## 2026-06-26 — Knight iteration: cancellation windows + automatic refunds

- **Item:** P0 "Cancellation refund + windows". `cancel_booking` only flipped
  status — no timing check, no refund — despite the 24h policy copy. Rewrote the
  `cancelBooking` server action: if the booking is `deposit_paid` and the
  appointment is ≥24h away, it looks up the deposit payment, issues a Stripe
  refund, records a `type='refund'` payment row (reusing the 0013 path), and marks
  the original deposit `refunded`; within 24h the deposit is forfeit. Also
  notifies the assigned cleaner and redirects with a refund-outcome banner
  (refunded / forfeit / cancelled) on the booking page.
- Code-only (no migration). Uses the service role for the payment writes.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25. ✅
- **Next up:** honest commission/payout model, OR cleaner-side issue reporting.

---

## 2026-06-26 — Knight iteration: repair the refund / dispute-resolution path

- **Item:** the admin refund + dispute-resolution path was broken end-to-end
  (prerequisite for the cancellation-refund P0):
  - `updateDisputeStatus` wrote `disputes.updated_at` (no such column) → every
    update failed → **admins literally could not resolve disputes**. Removed it.
  - `issueRefund` inserted `payment_type`/`notes`/`updated_at` (nonexistent) +
    enum `'refund'` (not in payment_type) → the Stripe refund fired but the DB
    record always failed (money out, unrecorded). Migration `0013` adds `'refund'`
    to `payment_type`, `'refunded'` to `payment_status`, and a `notes` column;
    `issueRefund` now records correctly with `type`, marks the original payment
    `refunded`, and throws a clear error if the DB write fails.
  - Dispute page queried `payments.payment_type` (nonexistent) → refund panel
    always empty. Fixed to `type`; also removed a no-op `onChange` that would
    crash the server-rendered `<select>`.
- **DB:** 0013 applied via pooler with per-statement autocommit (ALTER TYPE ADD
  VALUE can't be used in the same txn). Verified: payment_type = balance/deposit/
  refund, payment_status = failed/paid/pending/refunded, payments.notes present.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25. ✅
- **Next up:** cancellation windows + automatic Stripe refunds — now unblocked
  (reuses this corrected refund recording).

---

## 2026-06-26 — Knight iteration: cleaner Online/Offline toggle

- **Item:** P0 "Cleaner Online/Offline toggle". The only on/off was the
  admin-controlled `active` flag, so a cleaner who's sick / fully booked / on
  vacation kept getting offers to decline. Migration `0012` adds
  `cleaner_details.accepting_jobs` (default true) and gates the `request_booking`
  dispatch fan-out on it (`and cd.accepting_jobs`). Added `setAvailability` server
  action + an Online/Offline toggle (pulsing status dot) at the top of the cleaner
  jobs page. RLS already lets a cleaner update their own row, and the 0009 trigger
  only locks `id_verified`, so the toggle is safe.
- **DB:** applied via pooler (aws-1-ca-central-1), verified — column present,
  dispatch gated on `accepting_jobs`.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25. ✅
- **Next up:** cancellation windows + automatic Stripe refunds (cluster with the
  admin refund-column fix, since both touch the refund path).

> Between firings the founder requested a full-page dark/futuristic landing
> redesign — shipped live (commit `fec894d`, 6 new animated section components).

---

## 2026-06-26 — Knight iteration: double-booking guard in accept_offer

- **Item:** P0 "Double-booking guard". `accept_offer` only checked booking status
  + offer existence, so a cleaner could accept two overlapping jobs (guaranteed
  no-show). Migration `0011` rewrites `accept_offer` to reject an accept when the
  cleaner already holds a committed job (`accepted/deposit_paid/in_progress`)
  whose window — expanded by a 1-hour travel buffer — overlaps this booking
  (`tstzrange && tstzrange`); raises `SCHEDULE_CONFLICT`. Added partial index
  `bookings_cleaner_sched_active_idx`. `acceptJob` now catches that and redirects
  to `/cleaner/jobs?notice=conflict` (friendly amber banner) instead of throwing.
- **DB:** applied via the pooler (aws-1-ca-central-1) and verified live —
  `pg_get_functiondef` contains the guard, index exists.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 25/25. ✅
- **Next up:** cancellation windows + automatic Stripe refunds (P0).

> Note: between knight firings, the founder requested a futuristic animated
> homepage redesign — shipped live (commit `3538506`): animated aurora/dust-mote
> hero, cursor spotlight, gradient headline, scroll reveals, CountUp stats.

---

## 2026-06-26 — Knight iteration: fix broken reviews existence-check

- **Item:** P0 "Broken reviews query". `bookings/[id]/page.tsx` checked for an
  existing review with `.eq("reviewer_id", user.id)`, but the `reviews` table
  (0006) has no `reviewer_id` column — the query errored and `hasReview` silently
  stayed false, so the "Leave a review" prompt could reappear after a review and a
  resubmit would hit the unique `booking_id` constraint. Fixed to check by the
  unique `booking_id` alone (correct, since reviews are 1:1 with a booking and the
  booking was already loaded for this user). The insert action was already correct.
- **Verify:** `tsc --noEmit` clean · `npm test` 3/3 pass · `next build` 25/25. ✅
- **Next up:** double-booking guard in `accept_offer` (migration 0011).

---

## 2026-06-26 — ✅ Security migration 0009 APPLIED to live DB + brainstorm landed

- **Root cause found:** the Supabase project had **auto-paused** (free tier, 7-day
  idle; last activity June 18). Its API/DB hosts returned NXDOMAIN, which is why
  no DB write worked. Founder resumed it.
- **Applied `0009_security_hardening.sql`** via the Supabase pooler
  (`aws-1-ca-central-1`, Node + `pg`, run from PowerShell since the Bash sandbox
  can't resolve `*.supabase.co`). **Verified live:** both triggers present
  (`trg_prevent_profile_privesc`, `trg_enforce_cleaner_verification`) and
  `create_notification` EXECUTE now limited to `postgres`/`service_role`
  (anon/authenticated/PUBLIC revoked). **The 3 critical RLS holes are closed.**
- **Brainstorm workflow complete** → `docs/ROADMAP.md` + `docs/specs/uber-cleaner-map.md`
  (357-line buildable spec) + `docs/BRAINSTORM-RESULT.json`. It sharpened the P0
  list (broken reviews query, no dispatch scheduler, double-booking guard,
  cancellation refunds, honest commission/payout, cleaner-side disputes, real ID
  verification, transactional email/SMS) — folded into AUTONOMOUS-PLAN.md.
- **DB apply now works** for future migrations (pooler method recorded in the
  playbook) — so the knight is no longer blocked on schema changes.

---

## 2026-06-26 — P0 security migration (written + committed, apply pending)

**Shipped — batch 2 (migration `0009_security_hardening.sql`)** — fixes 3 critical
holes the audit found in the RLS layer:
- **Privilege escalation**: `profiles` UPDATE had no `WITH CHECK`, so any signed-in
  user could `UPDATE profiles SET role='admin'` on their own row via the API.
  Fixed with a `BEFORE UPDATE` trigger that blocks non-admins from changing
  `role`/`id`.
- **Cleaner self-verification**: cleaner_details policies let a cleaner set
  `id_verified=true` themselves. Trigger now forces verification to be
  admin-only (false on self-insert, unchanged on self-update).
- **Notification spoofing**: the `create_notification` SECURITY DEFINER RPC was
  callable by any user against any recipient. Revoked from PUBLIC/anon/
  authenticated; granted to `service_role` only (the app inserts via service role,
  so nothing legitimate breaks).

**⚠️ NOT YET LIVE:** I could not apply this migration from this environment —
Supabase's direct DB host (`db.<ref>.supabase.co`) no longer resolves (pooler-only
now) and the `supabase` CLI isn't installed here. The migration is reviewed and
committed. **Founder action:** run `supabase db push` (or paste
`supabase/migrations/0009_security_hardening.sql` into the Supabase SQL editor).
Until applied, the privilege-escalation hole remains open in the live DB.

---

## 2026-06-26 — Session start: analysis + first fixes

**Set up**
- Created work branch `dustbusters-autonomous` (main left untouched).
- Ran a 9-agent production-readiness **audit** → saved to `docs/AUDIT-FINDINGS.json`.
- Ran a multi-lens **brainstorm** (feature roadmap + Uber-style cleaner-map design)
  → will produce `docs/ROADMAP.md` and `docs/specs/uber-cleaner-map.md`.

**Shipped — batch 1 (commit `6974107`): audit-driven UI/auth fixes**
- Tailwind v4 theme bug: `--color-accent*` were in `:root`, so `text-accent` /
  `bg-accent` / `hover:text-accent-light` utilities generated **no CSS** — the
  notification badge, desktop nav hover/active states, and the login link were
  silently dead app-wide. Moved tokens into `@theme`; confirmed rules now emit in
  compiled production CSS.
- Restored keyboard focus rings (invalid `ring:` CSS → real `:focus-visible`
  outlines) on all primary/secondary CTAs (WCAG 2.4.7).
- Added `.text-gradient-on-dark` for the navbar logo + pricing `$20` (navy half
  was ~invisible on dark surfaces).
- Login: handle signup-with-email-confirmation (no session → "check your email"
  instead of a silent logged-out redirect); added show/hide password,
  forgot-password reset, and autocomplete hints.
- **Verify:** `tsc` clean · `next build` 25/25 · accent rules present in built CSS.

**Earlier this session (pre-audit, on this branch's parent): UX foundation**
- Removed broken `prefers-color-scheme: dark` overrides → locked to a polished
  light theme (was rendering unreadable mixed light/dark patches in OS dark mode).
- Made the nav mobile-responsive (`NavClient.tsx` hamburger + dropdown).
- Extracted a shared `Footer` into the layout (was homepage-only).

**Next up:** assemble `AUTONOMOUS-PLAN.md` from audit + roadmap, then work the
backlog (more audit fixes → Uber cleaner-map → high-value features).

**⛔ Needs the founder (cannot be automated):**
- Stripe **live** keys + webhook signing secret (`STRIPE_WEBHOOK_SECRET` is empty).
- `NEXT_PUBLIC_BASE_URL` is still `localhost` — needs the real deployed URL.
- Vercel deploy.
- Rotate the Supabase service-role key + DB password (were shared in chat history).
