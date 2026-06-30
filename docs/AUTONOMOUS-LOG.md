# 🛡️ Autonomous Knight — Progress Log

Newest entries at the top. The founder reads this to see what happened while away.
Operating procedure: `AUTONOMOUS-KNIGHT.md`. Backlog: `AUTONOMOUS-PLAN.md`.

---

## 2026-06-30 — Knight firing: cleaner-facing payout status

- **Shipped item (0044 follow-up, code-only, no migration):** the cleaner earnings
  page now surfaces payout status from `payout_paid_at` — an **"Awaiting payout"**
  stat ($ take-home from settled jobs not yet paid out, with "$X paid out to date")
  and a per-job **"Payout"** column (Paid out / Owed / —). Closes the loop from the
  admin payouts tool (0044): when the admin marks a cleaner paid, the cleaner sees
  it. Real take-home transparency.
- **Verify:** `tsc` clean · `vitest` 62 green · `next build` compiled. Committed +
  pushed.
- **Status:** safe backlog genuinely complete now (payouts loop closed). Remaining:
  founder-tied only (photos smoke-test; referral credit; launch path).

---

## 2026-06-30 — FEATURE: cleaner payouts tracking (operator payroll tooling)

- **Ideation found a genuinely valuable safe item** beyond the cleared UI backlog:
  cleaners are paid manually off-system (HANDOFF) with no view of who's owed.
- **Shipped (migration `0044`):** `bookings.payout_paid_at` (+ partial index on
  unpaid settled bookings). New **`/admin/payouts`** lists outstanding payouts per
  cleaner (jobs · owed + grand total) with a confirm-guarded **"Mark paid"** that
  stamps every settled (`balance_paid`/`closed`), still-owed booking of theirs.
  **Record-keeping only — no money moves through the app** (not a transfer; within
  the hard safety rules, like the existing refund-record rows). Dashboard nav card
  added. Admin writes via the existing `is_admin()` bookings update policy.
- **Verify:** applied via the pooler (column + partial index confirmed); `tsc`
  clean · `vitest` 62 green · `next build` compiled `/admin/payouts`. Committed +
  pushed.
- **Next up:** genuinely down to founder-tied items (photos upload smoke-test;
  referral credit; launch path). Future firings: minor polish or hold.

---

## 📊 Milestone summary — 2026-06-30 (run total ~39 items, DB at 0043)

Suite **62** tests. Since the last milestone the revenue/ops layer landed and the
small backlog was cleared:

- **Revenue / growth (functionally money-tested):** recurring bookings (0039) +
  pause/resume/skip-next/remove + add-ons-on-series (0043); referral/first-clean
  discount (0040); service add-ons (0042). Admin manages promos + add-ons; sees
  redemptions + an 8-week bookings/revenue trend.
- **Cleaner ops:** "on my way / running late" status, "your week" 7-day agenda,
  earnings period summary, demand card, deposit-deadline visibility.
- **Customer polish:** add-ons on booking page + printable receipt, deposit/balance
  bar, getting-ready card, add-to-calendar, recurring management.
- **⛔ Needs the founder (only big items left):** before/after photos (Storage —
  browser upload not headlessly verifiable; wants a smoke-test); referral-credit/
  wallet (money model); + the launch path (Stripe webhook secret + deploy, email/
  SMS keys, Stripe Connect, ID verification).

---

## 2026-06-30 — Knight firing: cleaner "your week" agenda

- **Shipped item (IDEAS batch 15 #3, code-only, no migration):** a glanceable
  7-day planner on `/cleaner/jobs` (today + 6 days, Pacific) — per-day job count +
  earliest start, free days highlighted, today ringed. Reuses the already-fetched
  `myJobs` (no extra query); a route-planning / free-slot view distinct from the
  status-grouped list below it.
- **Verify:** `tsc` clean · `vitest` 62 green · `next build` compiled. Committed +
  pushed.
- **Status:** the safe, autonomously-buildable backlog is now essentially complete.
  Remaining value is founder-tied (photos smoke-test; referral credit; launch path).

---

## 2026-06-30 — Knight firing: add-ons on recurring series

- **Shipped item (IDEAS batch 15 #2):** migration **`0043`** — `recurring_series.addons`
  + `create_recurring_series` gains a 9th param `p_addons` (stores on the series +
  applies to the first occurrence) + `generate_due_recurring` recreated to pass the
  series' add-ons to every generated occurrence. Calls `request_booking` via named
  args so the promo param stays default-NULL. `/book` now allows add-ons on a
  recurring plan (promo codes remain one-time-only).
- **Verify:** applied via the pooler; **functionally tested in a rolled-back txn**:
  a weekly series with interior windows → first booking total $90 ($60 + $30),
  booking_addons row present, `series.addons` stored — PASS, nothing persisted.
  `tsc` clean · `vitest` 62 green · `next build` compiled. Committed + pushed.
- **Next up:** the safe backlog is essentially complete (cleaner weekly calendar
  view is the last small promoted idea). Remaining big value is founder-tied
  (before/after photos upload smoke-test; referral-credit model).

---

## 2026-06-30 — Knight firing: add-on line items on the receipt

- **Shipped item (IDEAS batch 15 #1, code-only, no migration):** the printable
  receipt (`/bookings/[id]/receipt`) now itemizes each paid add-on (label · price)
  in its own "Add-ons" block above the payments — completes the add-ons surface
  (the total already included them). Fetches `booking_addons` (RLS-scoped).
- **Verify:** `tsc` clean · `vitest` 62 green · `next build` compiled. Committed +
  pushed.
- **Next up:** add-ons on recurring series (batch 15 #2). Remaining big items
  founder-tied (photos upload smoke-test; referral credit).

---

## 2026-06-30 — Knight firing: admin bookings/revenue trend

- **Shipped item (IDEAS batch 14 #2, code-only, no migration):** a "Last 8 weeks"
  mini bar chart on the admin dashboard — bookings created per rolling 7-day window
  (CSS bars, no chart lib), each bar's revenue on hover, with an 8-week total
  header. Reuses the existing payments + bookings fetches (added `created_at` to
  the bookings select). Read-only ops trend visibility ("are we growing?").
- **Verify:** `tsc` clean · `vitest` 62 green · `next build` compiled. Committed +
  pushed.
- **Ideation pass:** IDEAS Batch 15 — promoted receipt add-on line items +
  add-ons-on-recurring. Noted the growth/revenue trio + tooling are complete; the
  remaining big value is founder-tied (photos upload smoke-test; referral credit).
- **Next up:** add-on line items on the receipt (small).

---

## 2026-06-30 — Knight firing: admin add-ons CRUD

- **Shipped item (0042 follow-up, code-only, no migration):** `/admin/addons` — the
  founder can create paid extras (label, key, price, sort) and activate/deactivate,
  mirroring `/admin/promos`. Server actions via the admin RLS on `service_addons`
  (no service key); validated inputs (key normalized to a slug) + friendly
  duplicate banner; added an "Add-ons" card to the admin dashboard. The upsell menu
  is now fully self-serve (no SQL).
- **Verify:** `tsc` clean · `vitest` 62 green · `next build` compiled the new
  `/admin/addons` route. Committed + pushed.
- **Next up:** the safe backlog is largely complete; remaining big items are
  founder-tied (before/after photos upload smoke-test; referral-credit/wallet
  model). Next firings: small polish / ideation, or those when the founder's around.

---

## 2026-06-30 — ⭐ FEATURE: Service add-ons / paid extras

- **Next P-MAJOR (AOV upsell).** Migration **`0042`** (APPLIED + verified live):
  - `service_addons` menu (admin-RLS; seeded: inside fridge/oven $25, interior
    windows $30, laundry $20) + `booking_addons` (snapshots label+price at booking
    time so later edits don't rewrite past bookings).
  - `request_booking` recreated with `p_addons` (9th arg): `total = base
    (hours·rate) + add-ons`; cleaner payout on the FULL total (they do the extra
    work); promo + commission apply to the new total (consistent with 0040). Only
    valid active add-ons count; snapshot rows inserted.
- **Pricing functionally tested** in a rolled-back txn: 3h ($60) + fridge $25 +
  windows $30 = total $115, deposit $69, balance $46, payout $97.75, 2 snapshot
  rows — **PASS**, nothing persisted.
- **UI:** add-on checkbox cards live in `PriceEstimator` (estimated total + deposit
  update as you tick them); shown on the booking page payment card and the cleaner
  job page (after deposit, as the extras to perform). Promo + add-ons are one-time-
  booking only (clear inline message on recurring).
- **Verify:** `tsc` clean · `vitest` 62 green · `next build` compiled. Committed +
  pushed.
- **Next up:** admin add-ons CRUD (mirror the promo admin page); then the founder-
  tied items (photos upload smoke-test; referral-credit model).

---

## 2026-06-30 — Knight firing: admin promo-usage report

- **Shipped item (IDEAS batch 13 #3, code-only, no migration):** a "Recent
  redemptions" section on `/admin/promos` — a table of bookings that applied a code
  (code · customer · discount · date · booking link) plus a header summary
  (N uses · $ total discounted across the recent 100). Read-only via admin RLS on
  bookings. Gives the founder marketing visibility into how the promo feature is
  being used.
- **Verify:** `tsc` clean · `vitest` 62 green · `next build` compiled. Committed +
  pushed.
- **Ideation pass:** IDEAS Batch 14 — promoted service add-ons (next P-MAJOR,
  upsell/AOV) + an admin revenue/bookings trend. Photos + referral-credit stay
  founder-tied.
- **Next up:** service add-ons / paid extras (next P-MAJOR).

---

## 2026-06-30 — Knight firing: skip the next recurring visit

- **Shipped item (IDEAS batch 13 #2):** migration **`0041`** —
  `skip_next_occurrence(series)` cancels the upcoming not-yet-committed booking for
  a series (offers cleared; no deposit paid = nothing to refund) and advances
  `next_at` past the skipped slot to the following occurrence. Owner-only. UI: a
  "Skip next" button on the account recurring-plans list (active plans), alongside
  Pause / Resume / Remove — so a customer away one week can skip just that visit
  without pausing the whole plan.
- **Verify:** applied via the pooler; **functionally tested in a rolled-back txn**
  (faked `request.jwt.claims`): created a series + first booking, skipped it →
  booking `cancelled`, offers 0, `next_at` advanced one period — PASS, nothing
  persisted. `tsc` clean · `vitest` 62 green · `next build` compiled. Committed +
  pushed.
- **Next up:** admin promo-usage report (verifiable). Photos still wants a founder
  smoke-test.

---

## 📊 Milestone summary — 2026-06-30 (run total ~31 items)

Branch `dustbusters-autonomous`; DB at migration **0040**; tests **62** (4→62 this
run). Two flagship growth features shipped this stretch + supporting work:

- **Growth / big features:** recurring bookings (`0039`, lazy cron-free generation
  + pause/resume/remove lifecycle), referral / first-clean discount (`0040`,
  platform-absorbs, money math functionally tested) + promo-code admin UI.
- **Marketplace depth (earlier this run):** cleaning checklist, cleaner time-off +
  weekly work-days (all 3 dispatch paths), bio + specialties (everywhere), PWA.
- **UX/perf/a11y:** map coverage-ring + auto-fit, deposit/balance bar, add-to-
  calendar, printable receipt, "getting ready" card, jobs/booking read
  parallelization, aria-live job feed, cleaner "on my way / late" status.
- **⛔ Needs the founder (unchanged, highest leverage):** Stripe webhook secret +
  live keys, Vercel deploy, email/SMS keys, Stripe Connect, ID verification.
- **Queued (verifiable):** skip-next-recurring; admin promo usage report. **Wants a
  founder smoke-test:** before/after photos (Storage; browser upload not headlessly
  verifiable).

---

## 2026-06-30 — Knight firing: cleaner "on my way / running late" status

- **Shipped item (IDEAS batch 13 #1, code-only, no migration):** an "Update the
  customer" card on the cleaner job page (deposit_paid/in_progress) with two
  one-tap buttons — **On my way** / **Running ~15 min late** — that send the
  customer an in-app notification via the service-role `createNotification` (new
  `cleaner_update` type, in-app only). The action re-checks the cleaner owns the
  job + the status before sending. Reduces day-of customer anxiety / no-access.
- **Verify:** `tsc` clean · `vitest` 62 green · `next build` compiled. Committed +
  pushed.
- **Next up:** skip-next-recurring (verifiable) or the admin promo-usage report.

---

## 2026-06-30 — Knight firing: recurring plan lifecycle (pause/resume/remove)

- **Product-owner call:** the next listed P-MAJOR was before/after photos, but its
  core (browser file upload) can't be verified headlessly and it's privacy-
  sensitive (home photos + path-scoped Storage RLS). Shipping that blind on the
  unattended loop isn't prudent — deferred it with a "founder smoke-test" note and
  shipped a **verifiable** high-value item instead: completing the recurring
  feature's lifecycle.
- **Shipped (code-only, no migration):** the account "Recurring plans" card now
  lists **active + paused** plans. **Pause** stops generating new visits (the
  vacation case), **Resume** restarts, **Remove** deletes the plan — all RLS-owner-
  scoped (`pauseRecurring`/`resumeRecurring`/`removeRecurring`). Was previously a
  one-way "Stop" that hid the plan with no way back.
- **Verify:** `tsc` clean · `vitest` 62 green · `next build` compiled. Committed +
  pushed.
- **Ideation pass:** IDEAS Batch 13 — promoted cleaner "on my way" status + skip-
  next-recurring (both verifiable). Photos stays queued with the smoke-test caveat.
- **Next up:** cleaner "on my way / running late" status.

---

## 2026-06-30 — Knight firing: promo-code admin UI

- **Shipped item (0040 follow-up, code-only, no migration):** `/admin/promos` —
  the founder can now create promo codes (code, percent/amount + value, optional
  max-uses & expiry, first-clean-only), view usage (`used / max`, expiry, active),
  and activate/deactivate — no more SQL. Server actions go through the admin RLS on
  `promo_codes` (no service key); inputs validated with a friendly duplicate/error
  banner; added a "Promo codes" card to the admin dashboard.
- **Verify:** `tsc` clean · `vitest` 62 green · `next build` compiled the new
  `/admin/promos` route. Committed + pushed.
- **Next up (P-MAJOR):** before/after photos (Supabase Storage) — build defensively
  since the upload flow can't be browser-verified here.

---

## 2026-06-30 — ⭐ FEATURE: Referral / first-clean discount (promo codes)

- **The second big growth feature** (after recurring), per the product-owner
  mandate. Migration **`0040`** (APPLIED + verified live):
  - `promo_codes` (percent/amount, optional expiry / max_uses / first_clean_only;
    admin-only RLS) + `bookings.discount_amount` / `promo_code`.
  - `validate_promo(code)` — read-only preview for the form (valid? why not?).
  - `request_booking` recreated with `p_promo_code` (8th arg; 7-arg callers like
    `create_recurring_series` still resolve via DEFAULT). **Platform-absorbs
    model:** discount reduces the customer's total/deposit/balance, but the
    cleaner's payout is on the FULL pre-discount total — a promo never cuts cleaner
    pay (honest-money, 0015). `platform_fee = discounted_total − payout` (platform
    funds the promo; can reach 0/negative for a generous code = acquisition cost).
  - Atomic `used_count` increment (row locked); discount clamped to [0, total].
- **Money math functionally tested** in a rolled-back transaction (faked
  `request.jwt.claims` → a real customer): WELCOME15 on a $60 clean → total $51,
  deposit $30.60, balance $20.40, cleaner payout $51, platform_fee $0, discount $9
  — **PASS**. Nothing persisted.
- **UI:** promo field on `/book` (validated inline via `validate_promo`; blocked on
  recurring with a friendly message); discount line on the booking page payment
  card + the printable receipt. New `lib/promo.ts` (`normalizePromoCode` + 2 tests).
  Seeded `WELCOME15` (15% off) + `FIRST20` ($20 off, first-clean-only).
- **Verify:** `tsc` clean · `vitest` **60 → 62** · `next build` compiled. Committed
  + pushed.
- **Next up:** promo-code admin UI (manage codes without SQL); then before/after
  photos (Storage) as the next big P-MAJOR.

---

## 2026-06-30 — Map improvements (live cleaner map)

- **Context:** founder asked to "see how to improve the maps as well." Assessed the
  Uber-style `MatchingMap` (dark CARTO tiles, fuzzed pins, radar sweep, SVG
  fallback) and shipped the highest-impact, safe upgrades:
  - **Coverage ring:** a translucent emerald `Circle` (~2.2 km) around the area
    center so "cleaners near you" reads at a glance.
  - **Auto-fit framing:** a `FitBounds` helper (`useMap` + `fitBounds`, padding,
    `maxZoom: 14`) frames the area center + every cleaner pin instead of a fixed
    zoom — and only re-fits when the *set* of pins changes (a stable signature),
    so the view doesn't jump on every 2.5s poll.
  - **a11y:** the map region now has `role="img"` + a descriptive `aria-label`
    ("Live map showing N cleaners near <area>" / matched / area). (Radar already
    respects reduced-motion via globals.css.)
- **Verify:** `tsc` clean · `vitest` 60 green · `next build` compiled. Committed +
  pushed.
- **Map shortlist (not yet done):** pan/zoom focus to the winner pin on accept;
  an on-map "N cleaners nearby" chip; pin clustering if a dense market; live
  cleaner ETA/approach (needs real location sharing → larger/founder).

---

## 2026-06-30 — ⭐ FEATURE: Recurring bookings (product-owner pick)

- **Context:** founder said "do what seems fit — the knight has to think like a
  product owner and decide what improvement to bring." So instead of small polish,
  built the highest-leverage feature for a cleaning marketplace: **recurring
  bookings** (most cleans are weekly/biweekly — retention + predictable revenue).
- **Shipped (migration `0039`, APPLIED + verified live):**
  - `recurring_series` table (RLS owner-scoped: select/update/delete; inserts only
    via RPC) + `bookings.series_id`.
  - `create_recurring_series(...)` — inserts the series and creates the first
    occurrence by calling `request_booking` (so all pricing/matching/checklist/
    time-off/work-days logic is reused), tags the booking with `series_id`,
    returns the first booking id.
  - `generate_due_recurring(customer)` — **lazy, cron-free** generation: rolls
    each active series' `next_at` forward to the future (bounded), then creates the
    next occurrence only when it's within a 10-day lead window AND the series has
    no live booking (`broadcasting`→`completed`). This guarantees at most one
    booking per series per call → no duplicates, no runaway. Missed occurrences are
    skipped, not back-filled.
  - **No founder-gated pieces:** each occurrence is a normal booking paid via the
    existing deposit/balance flow (no auto-charge, no saved cards, no Connect).
  - **UI:** `/book` gets a "Repeat" select (one-time / every 1·2·4 weeks);
    `submitBooking` branches to `create_recurring_series` when a cadence is chosen;
    `/bookings` calls `generate_due_recurring` on load and badges series bookings
    "Recurring"; the account page lists active plans with a "Stop" (deactivate)
    action. New `lib/recurring.ts` (RECURRENCE_OPTIONS + `parseFrequencyWeeks` +
    `frequencyLabel`, +5 tests).
- **Verify:** applied via the pooler in a transaction; confirmed table + `series_id`
  + 3 RLS policies + both RPC signatures + interval math (structural only — did NOT
  run a live functional test that would create real bookings + ring cleaners).
  `tsc` clean · `vitest` **55 → 60** · `next build` compiled. Committed + pushed.
- **Next up (P-MAJOR):** referral / first-clean discount. Also: founder, the map
  has an improvement shortlist queued (see IDEAS / next entry).

---

## 2026-06-30 — Knight firing: parallelize cleaner job-detail reads (+ safe backlog now exhausted)

- **Shipped item (IDEAS batch 12 #2, code-only, no migration):** on the cleaner
  job-detail page, messages + (when reviewable) the existing-review check + the
  customer rating now run in one `Promise.all` (the conditional reads fall back to
  a resolved `{data:null}`) instead of three serial round-trips. Pure read
  reordering, no behaviour change.
- **Verify:** `tsc` clean · `vitest` 55 green · `next build` compiled. Committed +
  pushed.
- **🟑 Status — safe backlog exhausted:** with the three heavy pages parallelized,
  the **safe, non-founder, code-only backlog is genuinely done.** Across this run
  the Knight shipped **26 items** (8 migrations 0032–0038; suite 4 → 55). Remaining
  work is all ⛔ founder-gated or large/needs-sign-off — see below. Per the quality
  bar, the Knight will NOT invent marginal busywork to fill firings; future firings
  should ideate-only (no-op) until unblocked, or the loop should be paused/slowed.
- **⛔ Needs the founder (the real next steps):** add `STRIPE_WEBHOOK_SECRET` +
  Stripe live keys; deploy to Vercel (set `NEXT_PUBLIC_BASE_URL`); add Resend/Twilio
  keys to activate the built email/SMS channel; Stripe Connect for tips/payouts;
  real ID verification (Storage/Identity); decide rate-limit deploy-env + thresholds.
- **Larger / needs scope sign-off:** recurring/weekly bookings; referral / first-clean
  discount.

---

## 2026-06-30 — Knight firing: parallelize customer booking page reads

- **Shipped item (IDEAS batch 12 #1, code-only, no migration):** on the money-path
  booking page, the two lazy-expiry RPCs now run as one `Promise.all` (independent —
  they target different states) before the booking read, and the four cleaner-
  cluster reads (`get_cleaner_card` + `get_cleaner_bio` + `get_cleaner_specialties`
  + favorite) — all keyed only on the cleaner id — now run concurrently instead of
  four serial round-trips. Booking-first ordering and every downstream variable
  preserved; pure read reordering, no behaviour change. (Left the conditional
  matching/review/messages reads as-is to keep the refactor low-risk.)
- **Verify:** `tsc` clean · `vitest` 55 green · `next build` compiled. Committed +
  pushed.
- **Next up:** parallelize the cleaner job-detail page reads (batch 12 #2) — the
  last queued safe item; after it the safe non-founder backlog is done.

---

## 2026-06-30 — Knight firing: parallelize cleaner jobs page reads

- **Shipped item (IDEAS batch 11 #2, code-only, no migration):** the cleaner jobs
  page made four independent leading reads (availability, time-off, 7-day activity,
  open offers) sequentially; they now run in one `Promise.all` — four serial remote
  round-trips → one. The lazy-expiry RPCs → my-jobs ordering is deliberately
  preserved (my-jobs still read after expiries so a just-expired job doesn't
  linger). Pure read reordering, no behaviour change.
- **Verify:** `tsc` clean · `vitest` 55 green · `next build` compiled. Committed +
  pushed.
- **Ideation pass:** IDEAS Batch 12 — promoted the same perf win for the customer
  booking page + cleaner job-detail page. Reiterated: after these the safe
  non-founder backlog is effectively done.
- **Next up:** parallelize the customer booking page reads (batch 12 #1).

---

## 2026-06-30 — Knight firing: a11y aria-live on the live job feed

- **Shipped item (IDEAS batch 11 #1, code-only, no migration):** an `sr-only`
  `role="status" aria-live="polite"` line in the cleaner Job-requests header
  announces the open-request count ("3 open job requests") so screen-reader
  cleaners hear it change as `JobsLive` refreshes in real time (the visible list
  has no SR cue otherwise). Mirrors the booking-status aria-live pattern.
- **Verify:** `tsc` clean · `vitest` 55 green · `next build` compiled. Committed +
  pushed.
- **Next up:** jobs-page read parallelization (batch 11 #2) — the last queued safe
  item; then the well is founder-gated/large (see Batch 11 reality check).

---

## 2026-06-30 — Knight firing: work-days on reschedule + rebroadcast

- **Shipped item (0037 follow-up):** migration **`0038`** recreates
  `rebroadcast_booking` + `reschedule_booking` with the `work_days` weekday filter
  on top of the 0034 time-off filter (rebroadcast resolves the weekday from
  `b.scheduled_at`, reschedule from the new `p_scheduled_at`). The cleaner
  availability system (online toggle + time-off + work-days) is now consistent
  across **all three** dispatch paths.
- **Verify:** applied via the pooler in a transaction; confirmed both functions
  now carry **both** filters (work_days + time_off). RPC-only (no app code).
  `tsc` clean · `vitest` 55 green · `next build` compiled.
- **Ideation pass:** IDEAS Batch 11 — promoted 2 defensible small wins (aria-live
  on the live job feed, jobs-page read parallelization) and flagged plainly that
  the safe code-only well is shallow; bigger value is founder-gated or large
  (recurring bookings).
- **Next up:** aria-live job feed (batch 11 #1) or jobs-page perf (batch 11 #2).

---

## 2026-06-30 — Knight firing: cleaner weekly recurring availability

- **Shipped item (the "ambitious-but-grounded" pick as the safe well thinned):**
  migration **`0037`** adds `cleaner_details.work_days int[]` (Postgres DOW 0–6)
  and recreates `request_booking` to also skip a cleaner whose `work_days` don't
  include the booking's **Pacific** weekday — both match branches, preserving the
  0033 checklist + time-off logic. New `src/lib/weekdays.ts` (taxonomy +
  `sanitizeWorkDays`/`workDayLabels`, +6 tests). Cleaners pick days as
  checkbox-cards on their profile; NULL/empty = available any day (backward
  compatible). The recurring complement to one-off time-off — improves match
  quality + cuts wasted offers.
- **Verify:** applied via the pooler in a transaction; confirmed the column,
  single `request_booking` signature, all three filters present (work_days +
  time_off + checklist), eligibility unchanged (3 Courtenay cleaners, no
  work_days). `tsc` clean · `vitest` **49 → 55** · `next build` compiled.
- **Also:** deferred the map-winner-reveal trust item (`[~]`) — redundant with the
  static "About" card + would need a privacy-surface change to `get_booking_matching`.
- **Next up:** work-days on reschedule/rebroadcast (0034-style follow-up). The
  safe, non-founder code-only backlog is now genuinely shallow — remaining value
  is founder-gated or larger (recurring bookings, referral/discount).

---

## 2026-06-30 — Knight firing: printable receipt view

- **Shipped item (IDEAS batch 10 #2, code-only, no migration):** `/bookings/[id]/receipt`
  — a clean, paper-style receipt (branded header, billed-to/service/scheduled
  meta, itemized payments, Net paid total) RLS-scoped to the customer's own
  booking, with a "Print / Save as PDF" button (`window.print()`). Added a global
  `@media print` rule that hides the `nav`/`footer`/`.print-hide` chrome + the body
  gradient so it prints to clean paper, and a "View printable receipt" link in the
  booking Payments section.
- **Verify:** `tsc` clean · `vitest` 49 green · `next build` compiled the new
  `/bookings/[id]/receipt` route. Committed + pushed.
- **Next up:** bio/rating/specialties on the live-map winner reveal (batch 7 #2) —
  the last queued safe item; after that an ideation pass / the well is shallow.

---

## 📊 Milestone summary — 2026-06-30 (19 items shipped this run)

Branch `dustbusters-autonomous`; DB at migration **0036**; test suite **49** (4→49
across the run). All green. The loop has been productive and is now into smaller,
safe polish — the high-value remaining work is founder-gated.

- **New modules:** cleaning scope/checklist (0032), cleaner time-off (0033/0034),
  PWA install, cleaner bio (0035) + specialties (0036) — surfaced to customers,
  admin, favorites, and a self "preview" card.
- **Cleaner UX:** deposit-deadline visibility, demand "last 7 days" card, earnings
  7/30-day summary, profile completeness meter, customer rating on offer cards.
- **Customer UX:** deposit/balance split bar, "getting ready" pre-arrival card,
  add-to-calendar .ics, one-tap book-a-favorite.
- **Ops:** admin sees cleaner bio/specialties; bookings searchable by
  customer/cleaner name (+ export parity).
- **⛔ Needs the founder (unchanged):** Stripe live keys + `STRIPE_WEBHOOK_SECRET`,
  Vercel deploy, email/SMS keys (channel built), Stripe Connect (tips/payouts),
  real ID verification, rate limiting (deploy-env + thresholds).
- **Queued (safe P3):** printable receipt; bio/rating/specialties on the live-map
  winner reveal; admin roster areas/specialties columns. The safe code-only well
  is getting shallow — flagged in IDEAS Batch 10.

---

## 2026-06-30 — Knight firing: admin bookings search by customer/cleaner name

- **Shipped item (IDEAS batch 10 #1, code-only, no migration):** the admin
  bookings `q` filter now matches **area / customer name / cleaner name** (was
  area-only). Shared `bookingMatchesQuery` (`lib/admin-bookings`) applied in JS
  after the fetch — PostgREST can't OR a base column against two embedded profiles
  — and the **same predicate runs in the CSV export**, so "export what you see"
  still holds. Placeholder updated; +5 unit tests.
- **Verify:** `tsc` clean · `vitest` **44 → 49** · `next build` compiled. Committed
  + pushed.
- **Next up:** printable receipt view (batch 10 #2) or the live-map winner reveal
  trust info (batch 7 #2).

---

## 2026-06-30 — Knight firing: cleaner profile preview ("how customers see you")

- **Shipped item (IDEAS batch 9 #2, code-only, no migration):** a read-only
  preview card on the cleaner profile sidebar that mirrors the customer-facing
  booking card — avatar, name, ID-verified badge, jobs + rating (from
  `get_cleaner_card`), plus the saved bio + specialty chips, with a prompt when
  empty. Lets cleaners see exactly how they present and motivates polishing it.
- **Ideation pass (backlog thin):** IDEAS Batch 10; promoted 2 safe P3 items
  (admin booking name search, printable receipt view). Noted the safe code-only
  well is getting shallow — bigger remaining value is founder-gated.
- **Verify:** `tsc` clean · `vitest` 44 green · `next build` compiled. Committed +
  pushed.
- **Next up:** admin bookings name search (batch 10 #1) or printable receipt
  (batch 10 #2).

---

## 2026-06-30 — Knight firing: book-a-favorite (one-tap rebook)

- **Shipped item (IDEAS batch 9 #1, code-only, no migration):** each favorite on
  the account page now has a "Book" button → `/book?cleaner=<id>`. `/book`
  validates the param against the customer's own favorites and preselects that
  cleaner in the existing "Cleaner" dropdown (`prefillCleaner` → `request_booking`
  rings only that favorite if eligible). One-tap rebook of a trusted cleaner.
- **Verify:** `tsc` clean · `vitest` 44 green · `next build` compiled. Committed +
  pushed.
- **Next up:** cleaner profile preview "how customers see you" (batch 9 #2) or
  bio/rating/specialties on the live-map winner reveal (batch 7 #2). Backlog thin
  → next firing likely runs an ideation pass.

---

## 2026-06-30 — Knight firing: specialty chips on the favorites list

- **Shipped item (IDEAS batch 8 #2, code-only, no migration):** each favorite
  cleaner on the customer account page now shows up to 3 specialty chips (+N more)
  via `get_cleaner_specialties`, so customers remember why they favorited someone.
- **Ideation pass (backlog thin):** IDEAS Batch 9; promoted 2 safe P3 items
  (book-a-favorite button + `/book?cleaner=` prefill, cleaner profile preview).
- **Verify:** `tsc` clean · `vitest` 44 green · `next build` compiled. Committed +
  pushed.
- **Next up:** book-a-favorite button (batch 9 #1) or cleaner profile preview
  (batch 9 #2).

---

## 2026-06-30 — Knight firing: cleaner bio/specialties on the admin detail page

- **Shipped item (IDEAS batch 8 #1, code-only, no migration):** the admin cleaner
  profile card (`/admin/cleaners/[id]`) now shows the "About" bio + specialty chips
  (admin reads `cleaner_details` directly via RLS; added `bio, specialties` to the
  select). Gives ops a quick read on how a cleaner presents to customers.
- **Verify:** `tsc` clean · `vitest` 44 green · `next build` compiled. Committed +
  pushed.
- **Next up:** specialty chips on the customer favorites list (batch 8 #2) or
  bio/rating/specialties on the live-map winner reveal (batch 7 #2 / 8 #3).

---

## 2026-06-30 — Knight firing: cleaner specialties / tags

- **Shipped item (IDEAS batch 6 #1):** migration **`0036`** adds
  `cleaner_details.specialties text[]` + a `get_cleaner_specialties(uuid)` SECURITY
  DEFINER reader (mirrors `get_cleaner_bio`). New `src/lib/specialties.ts`
  (canonical taxonomy: deep clean, move-in/out, pet-friendly, eco, windows,
  laundry, post-reno, office, organizing + `sanitizeSpecialties`/`specialtyLabels`,
  +5 unit tests). Cleaners pick them as checkbox-cards on their profile (saved via
  RLS); shown as chips in the "About <name>" card on the booking page. Trust +
  future filtering.
- **Ideation pass (backlog thin):** IDEAS Batch 8; promoted 2 safe P3 items (admin
  bio/specialties view, favorites specialty chips).
- **Verify:** applied via the pooler in a transaction (column + reader confirmed,
  sample call null/no error); `tsc` clean · `vitest` **39 → 44** · `next build`
  compiled. Committed + pushed.
- **Next up:** admin cleaner bio/specialties view (batch 8 #1) or favorites
  specialty chips (batch 8 #2).

---

## 2026-06-30 — Knight firing: cleaner earnings period summary

- **Shipped item (IDEAS batch 7 #3, code-only, no migration):** two rolling
  net-earnings stat cards — "Last 7 days" and "Last 30 days" (with job counts) —
  below the existing all-time summary on the cleaner earnings page. Computed by
  job date from the paid jobs using the same stored-payout math, so a cleaner sees
  recent momentum, not just a lifetime total.
- **Verify:** `tsc` clean · `vitest` 39 green · `next build` compiled. Committed +
  pushed.
- **Next up:** cleaner specialties/tags (batch 6 #1, migration) or cleaner
  bio/rating on the map winner reveal (batch 7 #2). Backlog thin → next firing
  likely runs an ideation pass.

---

## 2026-06-30 — Knight firing: add-to-calendar (.ics)

- **Shipped item (IDEAS batch 7 #1, code-only, no migration):** a new
  `GET /bookings/[id]/calendar` route streams an RFC-5545 `.ics` for the
  appointment (escaped text fields, UTC timestamps, DTEND = start + hours,
  location = the address when RLS lets the caller read it else the area, plus a
  link back). RLS-aware — only the booking's customer or assigned cleaner can
  download it. "Add to calendar" links added to the customer booking page and the
  cleaner job page (shown for `accepted`/`deposit_paid`/`in_progress`). Reduces
  no-shows on both sides.
- **Verify:** `tsc` clean · `vitest` 39 green · `next build` compiled the new
  `/bookings/[id]/calendar` route. Committed + pushed.
- **Next up:** cleaner bio/rating on the map winner reveal (batch 7 #2) or cleaner
  specialties/tags (batch 6 #1, migration).

---

## 2026-06-30 — Knight firing: cleaner onboarding completeness meter

- **Shipped item (IDEAS batch 6 #4, code-only, no migration):** a "Profile
  completeness" card on the cleaner profile sidebar — a % bar + a checklist of
  what's still missing (name, phone, service areas, About me), or a "looks great"
  state at 100%. Nudges cleaners to finish a credible, bookable profile (more
  complete profiles → more trust → more accepts).
- **Ideation pass (backlog was thin):** added IDEAS Batch 7 and promoted 3 safe
  P3 items (add-to-calendar `.ics`, cleaner bio/rating on the map winner reveal,
  cleaner earnings period summary).
- **Verify:** `tsc` clean · `vitest` 39 green · `next build` compiled. Committed +
  pushed.
- **Next up:** cleaner specialties/tags (batch 6 #1, migration) or add-to-calendar
  `.ics` (batch 7 #1, code-only).

---

## 2026-06-30 — Knight firing: "getting ready" pre-arrival card

- **Shipped item (IDEAS batch 6 #2, code-only, no migration):** a "Getting ready
  for your clean" checklist card on the customer booking page (secure pets,
  parking/access, put away valuables, the cleaner brings supplies, watch chat),
  shown once a cleaner is matched and the job is upcoming/ongoing
  (`accepted`/`deposit_paid`/`in_progress`). Reduces day-of access hiccups and the
  no-show category cleaners can otherwise report.
- **Verify:** `tsc` clean · `vitest` 39 green · `next build` compiled. Committed +
  pushed.
- **Next up:** cleaner onboarding completeness meter (batch 6 #4) or cleaner
  specialties/tags (batch 6 #1, needs a migration). Backlog getting thin → next
  firing may run an ideation pass.

---

## 2026-06-30 — Knight firing: customer rating on the cleaner's offer card

- **Shipped item (IDEAS batch 6 #3, code-only, no migration):** each open-offer
  card on `/cleaner/jobs` now shows "Customer: ⭐ X.X (N)" (or "New customer")
  pulled from the existing `get_customer_rating` RPC (SECURITY DEFINER), fetched
  per unique offer customer via `Promise.all` (the open-offer list is small).
  Added `customer_id` to the offers query. Closes the two-way-review loop on the
  supply side — a cleaner can now accept informed.
- **Verify:** `tsc` clean · `vitest` 39 green · `next build` compiled. Committed +
  pushed.
- **Next up:** "what to expect" pre-arrival card (batch 6 #2) or the onboarding
  completeness meter (batch 6 #4).

---

## 📊 Milestone summary — 2026-06-30 (8 items shipped this run)

Since the loop was restarted today, 8 verified+pushed items (HEAD `~`8 commits on
`dustbusters-autonomous`); test suite 30 → 39; DB at migration **0035**.

- **New product modules:** cleaning scope/checklist (`0032`), cleaner time-off
  (`0033`, honoured across all 3 dispatch paths incl. `0034`), PWA installability,
  cleaner "About me" bio (`0035`).
- **Cleaner UX:** deposit-deadline visibility on awaiting-deposit jobs, demand/
  activity "last 7 days" card.
- **Customer UX:** deposit/balance split bar.
- **Queued (P3, safe):** specialties/tags, "what to expect" card, customer rating
  on the offer card, onboarding completeness meter (IDEAS batch 6).
- **⛔ Needs the founder (unchanged):** Stripe live keys + `STRIPE_WEBHOOK_SECRET`,
  Vercel deploy, email/SMS keys (channel built), Stripe Connect (tips/payouts),
  real ID verification (Storage/Identity), rate limiting (deploy-env + thresholds).

---

## 2026-06-30 — Knight firing: cleaner "About me" bio

- **Shipped item (trust feature) + ideation pass (backlog was thin):** migration
  **`0035`** adds `cleaner_details.bio`; cleaners edit it on their profile (existing
  RLS lets them update their own row), and a small `get_cleaner_bio(uuid)` SECURITY
  DEFINER reader exposes just the trimmed bio to customers (they can't read
  `cleaner_details` directly) — the same controlled-reveal pattern as
  `get_cleaner_card`, avoiding risky changes to that RPC's return type (it's
  consumed by `get_booking_matching`). Shown as an "About <name>" card on the
  booking cleaner card.
- **Ideation:** added IDEAS Batch 6 and promoted 4 safe P3 items (specialties/tags,
  what-to-expect card, customer rating on the offer card, onboarding meter).
- **Verify:** applied via the pooler in a transaction; confirmed the `bio` column +
  `get_cleaner_bio` signature, sample call returns null (no error). `tsc` clean ·
  `vitest` 39 green · `next build` compiled. Committed + pushed.
- **Next up:** customer's rating on the cleaner's offer card (batch 6 #3) or the
  "what to expect" card (batch 6 #2).

---

## 2026-06-30 — Knight firing: deposit/balance split bar

- **Shipped item (IDEAS batch 5 #4, code-only, no migration):** a two-segment
  emerald bar under the Payment card on the customer booking page visualising the
  deposit vs balance split (percentages always sum to 100), with a labelled
  legend and a `role="img"` aria-label for screen readers. Makes the "pay a bit
  now, the rest after" money split scannable at a glance.
- **Also:** dropped batch 5 #5 (saved-address on reschedule) as moot — reschedule
  only changes date/time, there's no address field to autocomplete.
- **Verify:** `tsc` clean · `vitest` 39 green · `next build` compiled. Committed +
  pushed.
- **Next up:** the plan's actionable `[ ]` list is down to founder/constrained
  items — the **next firing should run an ideation pass** (new IDEAS batch +
  promote). Candidate themes: referral/first-clean discount, before/after photos
  (needs Storage → likely founder), in-app tips (needs Stripe Connect → founder),
  cleaner weekly recurring availability, customer-facing cleaner ETA.

---

## 2026-06-30 — Knight firing: demand/activity indicator for cleaners

- **Shipped item (IDEAS batch 5 #3, code-only, no migration):** a "Last 7 days"
  card on `/cleaner/jobs` showing **Requests / Accepted / Accept-rate** from the
  cleaner's own `booking_offers` in the trailing 7 days (RLS scopes the table to
  the cleaner; one offer per eligible booking ≈ requests in their areas). When
  there were none, it shows a "staying online helps you catch new jobs" nudge —
  turning the empty state into a supply-side prompt.
- **Why offers (not all area bookings):** RLS lets a cleaner read only their own
  offers, so a true market-wide count would need a SECURITY DEFINER RPC; the idea
  was scoped "no schema change", so this uses the RLS-safe offer history.
- **Verify:** `tsc` clean · `vitest` 39 green · `next build` compiled. Committed +
  pushed.
- **Next up:** deposit/balance split bar (batch 5 #4), or an ideation pass — the
  plan's actionable `[ ]` list is getting short again.

---

## 2026-06-30 — Knight firing: time-off honoured on reschedule + rebroadcast

- **Skipped (logged ⛔ Needs the founder):** the top `[ ]` item, **rate limiting**,
  is now `[blocked]` — on serverless it needs a shared store (Upstash keys or a
  Supabase counter table) + founder-chosen thresholds, auth limits are already
  Supabase-side, and it touches core money-path RPCs (not a safe unattended job).
- **Shipped item (IDEAS batch 5 #2):** migration **`0034`** closes the 0033
  follow-up. `rebroadcast_booking` (0025) and `reschedule_booking` (0031) re-ring
  matching cleaners but ignored `cleaner_time_off`; recreated both with the same
  "not blocked on the Pacific service date" filter as `request_booking` (0033) —
  rebroadcast uses `b.scheduled_at`, reschedule uses the new `p_scheduled_at`. So
  a cleaner is never rung for a date they blocked, on a re-broadcast or a new time.
- **Verify:** applied via the pooler in a transaction; confirmed both signatures
  intact, both bodies now reference `cleaner_time_off`, and eligibility unchanged
  (3 Courtenay cleaners, no time-off). RPC-only (no app code). `tsc` clean ·
  `vitest` 39 green · `next build` compiled. Committed + pushed.
- **Next up:** demand indicator for cleaners (batch 5 #3) or deposit/balance split
  bar (batch 5 #4).

---

## 2026-06-30 — Knight firing: cleaner-side deposit-deadline visibility

- **Backlog was thin** (plan `[ ]` list = rate-limiting + founder/constrained), so
  ran an **ideation pass first**: added IDEAS.md Batch 5 and promoted 4 safe items
  into the plan (time-off on reschedule/rebroadcast, demand indicator, deposit/
  balance split bar, saved-address on reschedule).
- **Shipped item (IDEAS batch 5 #1, display-only, no migration):** when a cleaner
  has won a job but the customer hasn't paid yet (status `accepted`), they now see
  "Awaiting the customer's deposit — they must confirm by <Pacific date/time> or
  this slot is released" on **both** `/cleaner/jobs` (job card) and the job-detail
  customer card. Mirrors the customer-side 0029 deadline so the cleaner knows when
  a held slot may free up (falls back to a generic line if no deadline is set).
- **Verify:** `tsc` clean · `vitest` 39 green · `next build` compiled. Committed +
  pushed to `origin/dustbusters-autonomous`.
- **Next up:** time-off on reschedule/rebroadcast (0033 follow-up) or the demand
  indicator.

---

## 2026-06-30 — Feature: PWA installability (Add to Home Screen)

- **Item:** IDEAS batch 1 #6 (install half) — a mobile-first marketplace should be
  installable. Customers track live matching + pay from their phone; cleaners
  react to offers on the go.
- **Shipped (code-only, no DB, no secrets):**
  - `app/manifest.ts` — standalone display, brand-dark theme/background,
    short_name, description, categories.
  - Generated icons (no asset files): `/icons/192` + `/icons/512` route handlers
    (incl. a maskable 512) and `app/apple-icon.tsx` (iOS), all from a shared
    `lib/brand-mark.tsx` (emerald "DB" monogram on #070b14, ~38% safe-zone
    padding for maskable crops; matches opengraph-image).
  - `viewport.themeColor = #070b14` + `appleWebApp` metadata (capable, title,
    black-translucent status bar).
- **Note:** the OTHER half of the idea — web push notifications — still needs
  founder VAPID keys; logged, not attempted.
- **Verify:** `tsc` clean · `next build` compiled `/manifest.webmanifest`,
  `/icons/192`, `/icons/512`, `/apple-icon` (manifest + apple-icon prerendered
  OK, so the shared render path is proven) · 39 tests green. Committed + pushed.

---

## 2026-06-30 — Feature: cleaner time off (block specific dates)

- **Item:** IDEAS batch 3 #5 — match-quality improvement. Cleaners only had an
  on/off toggle; now they can block specific dates (vacation, appointments) so
  the dispatcher never rings them for a day they can't work.
- **Shipped (one additive migration + UI):**
  - **Migration `0033_cleaner_time_off`** (APPLIED + verified live via pooler):
    `cleaner_time_off` table (`cleaner_id`, `off_date`, unique per pair) with RLS
    (cleaner manages own rows). `request_booking` recreated to exclude a cleaner
    whose `off_date` equals the booking's **Pacific** service date — in both the
    preferred-cleaner and broadcast branches. Single 7-arg signature confirmed.
  - **Safety:** fully additive — a cleaner with no time-off rows is eligible
    exactly as before. Verified the seeded Courtenay roster still matches **3**
    eligible cleaners post-migration (dispatch unaffected).
  - **UI:** a "Time off" card on `/cleaner/jobs` — add a date (min = Pacific
    today), see upcoming blocked dates as removable chips. New `addTimeOff`
    (idempotent upsert) + `removeTimeOff` actions.
- **Known follow-up:** `reschedule_booking`/`rebroadcast_booking` re-ring on a new
  date without the time-off filter yet (low impact — the cleaner can decline).
- **Verify:** `tsc` clean · `vitest` 39 green · `next build` compiled. Committed +
  pushed to `origin/dustbusters-autonomous`.

---

## 2026-06-30 — Feature: structured cleaning scope / checklist on a booking

- **Item:** IDEAS batch 0 #1 ("room-by-room cleaning checklist") — the oldest
  high-value product idea, un-built until now. Turns a vague "3 hours" into a
  shared **definition of done**, cutting expectation-mismatch disputes.
- **Shipped (one additive migration + UI, fully backward-compatible):**
  - **Migration `0032_booking_checklist`** (APPLIED + verified live via pooler):
    `bookings.checklist text[]` + a 7th `request_booking` param `p_checklist`
    (DEFAULT NULL, empty → NULL). Old 6-arg signature dropped; single 7-arg
    signature confirmed. Recorded as `0032`.
  - **`src/lib/checklist.ts`** — canonical task taxonomy (Rooms / Tasks /
    Deep-clean extras), `sanitizeChecklist` (server-side: keeps only valid keys,
    dedups, canonical order — never trusts the client) + `checklistLabels`.
  - **`/book`** — a "What should we focus on?" fieldset of design-system
    `checkbox-card`s (grouped, responsive 2-col). Optional.
  - **Customer booking page** — a "Cleaning focus" card (badge chips), always
    visible to the customer who chose it.
  - **Cleaner job page** — same scope card, gated behind `deposit_paid+` (same
    privacy gate as the address + notes).
- **Verify:** `tsc` clean · `vitest` **30 → 39** (new `tests/lib/checklist.test.ts`,
  9 cases) · `next build` green. Committed + pushed to `origin/dustbusters-autonomous`.

---

## 2026-06-30 — ⏸️ Knight paused: backlog exhausted (no busywork)

- This firing found **no actionable, non-founder, unattended-safe item**. Per the
  playbook quality bar ("only ship changes with real user/operator value — no
  busywork, no bikeshedding"), no code change was made.
- **Remaining backlog is all gated:**
  - ⛔ Founder-only: Stripe live keys + `STRIPE_WEBHOOK_SECRET`, Vercel deploy,
    email/SMS provider keys (the channel is built — see 0612 messaging item),
    Stripe Connect payouts, real ID verification (Storage/Stripe Identity).
  - Needs the founder in the loop: rate limiting (needs a shared store on
    serverless + Supabase-side auth limits) — touches core RPCs.
  - Constrained / low-value: `vercel.json` region pinning (speculative without the
    deploy plan), static-gen for marketing (root layout reads auth cookies for the
    nav → needs a split layout first).
- **Action:** stopped the recurring cron (was every ~10 min) to avoid burning
  cycles on marginal polish. Restart anytime with "make the knight run" — ideally
  after a founder action (Stripe webhook secret + deploy) unlocks the real
  launch work.
- **Run total:** 18 verified+pushed items this session; 3 DB migrations (0029–
  0031); test suite 15 → 30; all green on `origin/dustbusters-autonomous`.

---

## 2026-06-30 — Knight iteration: admin customers/cleaners CSV export

- **Item:** P3 ops tooling (IDEAS batch 4) — completes the export trio
  (bookings/earnings already shipped).
- **Shipped:** `GET /admin/customers/export` (name, phone, joined, bookings,
  total spent) and `GET /admin/cleaners/export` (name, phone, verified, active,
  areas served). Both honour the list `q` (name/phone) filter and add an
  "Export CSV" button to their list page. UTF-8 BOM + attachment; RLS via the
  admin server client.
- **Verify:** `tsc` clean · `next build` green (both routes compiled) ·
  `npm test` 30/30.
- **⚠️ Backlog status:** the non-founder, unattended-safe backlog is now
  EXHAUSTED. Everything remaining is founder-gated (Stripe live keys +
  STRIPE_WEBHOOK_SECRET, Vercel deploy, email/SMS keys, Stripe Connect payouts,
  real ID verification) or wants the founder in the loop (rate limiter on core
  RPCs). Further firings would be ideation/marginal polish only — recommend
  pausing the loop and doing a founder action (Stripe webhook secret + deploy)
  for the next real step.

---

## 2026-06-30 — Knight iteration: surface the deposit deadline (pay-by urgency)

- **Item:** customer value — pairs with the 0029 deposit auto-expiry. An
  awaiting-deposit booking gave no sense of urgency, so a customer could lose the
  slot to expiry without warning.
- **Shipped:** added `deposit_deadline` to the booking-detail query and a
  "Reserve your slot — pay by <Pacific date/time> or it may be released" warning
  banner in the deposit-pay section (shown only when a deadline is set).
  Display-only, formatted in America/Vancouver.
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` 30/30.
- **Note:** non-founder safe backlog is essentially exhausted (IDEAS batch 4
  records this). Remaining substantial work is founder-gated or wants the founder
  in the loop (rate limiter). Recommend pausing or a founder action (Stripe
  webhook secret + deploy) for the next high-value step.
- **Next up:** admin customers/cleaners CSV export (last small safe item).

---

## 2026-06-30 — Knight iteration: harden the test safety net

- **Item:** the high-value non-founder feature backlog is essentially done, so
  rather than manufacture busywork or unilaterally touch core RPCs (rate limiter,
  which the founder wants to do together), strengthen the verify gate the loop
  relies on — pure, zero-risk, real value.
- **Added:** `tests/lib/status.test.ts` (bookingBadgeClass tone mapping +
  fallback, bookingStatusLabel compact labels + underscore-prettify fallback +
  "every status has a label" guard, paymentBadgeClass) and
  `tests/lib/messaging.test.ts` (isEmailConfigured/isSmsConfigured gating — proves
  email/SMS stay a no-op until keys are set). No app code touched.
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` **30/30**
  (was 20) across 4 files.
- **Next up:** remaining backlog is founder-gated (Stripe keys/deploy, email/SMS
  keys, Stripe Connect) or needs the founder in the loop (rate limiter). Likely
  ideation / a pause recommendation.

---

## 2026-06-30 — Knight iteration: reschedule a booking before deposit

- **Item:** P2 customer value (took on a larger item — small-polish backlog was
  exhausted). Customers could only cancel + rebook; now they can reschedule.
- **Migration 0031** (applied + verified live via pooler): `reschedule_booking(
  booking, scheduled_at)` SECURITY DEFINER — validates owner + pre-deposit status
  (broadcasting/accepted/no_cleaner_found) + a ≥15-min-future time, moves
  `scheduled_at`, resets the match (clears offers, nulls cleaner_id +
  deposit_deadline), re-rings matching/verified/available cleaners for the new
  time (same query as rebroadcast_booking), and releases + notifies any cleaner
  who had accepted the old time.
- **UI:** `reschedule-actions.ts` parses the datetime-local as Pacific
  (parseBookingDate) and redirects with a banner on error; a "Reschedule this
  booking" disclosure on the booking page (shown only pre-deposit) with a
  datetime input + pending SubmitButton, plus a success banner.
- **Verify:** migration verified live; `tsc` clean · `next build` green
  (27 routes) · `npm test` 20/20.
- **Next up:** backlog now mostly founder-gated (Stripe keys/deploy, email/SMS
  keys, Stripe Connect) + rate limiting (needs a shared store) — ideation/ founder.

---

## 2026-06-30 — Knight iteration: admin "this month" revenue

- **Item:** P3 (IDEAS batch 3). The dashboard showed only all-time revenue — no
  sense of current-month trend.
- **Shipped:** the Revenue stat card now shows all-time total as the headline with
  a "$X this month" sub. Computed by adding `paid_at` to the existing paid-payments
  query and summing rows whose `paid_at` falls in the current UTC calendar month
  (no extra query, refunds still excluded).
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` 20/20.
- **Next up:** backlog is thin/founder-gated — likely an ideation pass next.

---

## 2026-06-30 — Knight iteration: cleaner "Get directions" link

- **Item:** P3 (IDEAS batch 3). Cleaners had the service address but no quick way
  to navigate to it.
- **Shipped:** added a "Get directions" link to the job-detail address card — a
  Google Maps universal link (`maps/search/?api=1&query=<encoded address>`) that
  opens in a new tab on desktop and the Maps app on mobile. Only renders when the
  address is revealed (deposit_paid and later), reusing the existing gate.
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` 20/20.
- **Next up:** admin "this month vs all-time" revenue on the dashboard.

---

## 2026-06-30 — Knight iteration: admin bookings CSV export + ideation

- **Ideation pass** (safe actionable backlog had thinned to <3): added IDEAS.md
  Batch 3 and promoted three — admin bookings CSV export (shipped), cleaner
  "Get directions" link, admin month-vs-all-time revenue.
- **Shipped:** `GET /admin/bookings/export` route streams the bookings list as a
  CSV (Booking ID, Created, Scheduled, Status, Area, Customer, Cleaner, Hours,
  Total) honouring the same q/status/from/to filters as the list page, so admins
  "export what they see". Added an "Export CSV" button that carries the active
  filters into the export URL. UTF-8 BOM + attachment headers; RLS via the admin
  server client. Pairs with the date-range filter shipped earlier.
- **Verify:** `tsc` clean · `next build` green (`/admin/bookings/export`
  compiled) · `npm test` 20/20.
- **Next up:** cleaner "Get directions" link (trivial); admin month-vs-all-time
  revenue.

---

## 2026-06-30 — 📊 Milestone summary (16 Knight items shipped; 8 since the last)

Since the last milestone (item 8), shipped + verified + pushed to
`origin/dustbusters-autonomous`:
9. `591dce7` — Terms + Privacy pages
10. `6081cbb` — a11y: live status region + nav icons
11. `2aa78f9` — deposit_deadline auto-expiry (migration 0029)
12. `db34579` — transactional email/SMS channel abstraction
13. `5aad219` — LocalBusiness JSON-LD + ideation/plan hygiene
14. `8ab0026` — cleaner earnings CSV export
15. `0f46158` — admin bookings date-range filter
16. `(this)` — chat message report/flag (migration 0030)

Two production migrations applied this stretch (0029 deposit_deadline, 0030
message_reports), both transactional + verified. Test suite at 20. Backlog is now
mostly **⛔ founder-only** (Stripe live keys + webhook secret, Vercel deploy,
email/SMS keys, Stripe Connect payouts, real ID verification) plus constrained/
larger items (rate limiting needs a shared store; reschedule-before-deposit;
static-gen needs a split layout). Expect more ideation passes ahead.

---

## 2026-06-30 — Knight iteration: chat message report / abuse flag

- **Item:** trust & safety (IDEAS batch 2). Chat had no moderation path.
- **Migration 0030** (applied + verified live via pooler): `message_reports` table
  + unique (message_id, reported_by) + RLS (admin or own reporter can select) +
  `report_message(message_id, reason)` SECURITY DEFINER RPC that checks the caller
  is a participant of the message's booking before inserting (upsert refreshes a
  repeat report).
- **UI:** both chat panels (customer `bookings/[id]/MessagePanel`, cleaner
  `components/MessagePanel`) now show a per-message "Report" flag on incoming
  messages (confirm dialog, calls the RPC, marks "Reported"; fail-safe — chat is
  unaffected on error). New admin `/admin/reports` page lists open reports (message
  body, reporter, booking link, reason) with Mark reviewed / Dismiss actions
  (service-role); added a "Reports" nav card on the admin dashboard.
- **Verify:** migration verified live; `tsc` clean · `next build` green
  (`/admin/reports` compiled) · `npm test` 20/20.
- **Next up:** mostly founder-blocked / larger items — likely an ideation pass.

---

## 2026-06-30 — Knight iteration: admin bookings date-range filter

- **Item:** P3 (IDEAS batch 2). The admin bookings list only filtered by area +
  status — no way to scope by date.
- **Shipped:** added `from`/`to` `<input type="date">` controls to the existing
  JS-free GET AdminSearch form; the page validates them (YYYY-MM-DD) and filters
  `scheduled_at` server-side with `.gte(from T00:00:00)` / `.lte(to T23:59:59.999)`
  (whole "to" day inclusive). Combines with area + status; the subtitle shows the
  active range. No new deps, no DB change.
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` 20/20.
- **Next up:** chat message report/flag (trust & safety).

---

## 2026-06-30 — Knight iteration: cleaner earnings CSV export

- **Item:** P3 (IDEAS batch 2). Cleaners had no way to pull their job/income
  history for bookkeeping or taxes.
- **Shipped:** `GET /cleaner/earnings/export` route handler streams the cleaner's
  completed/paid/closed jobs as a CSV — Date, Area, Hours, Gross, Platform fee,
  Net payout, Status — with a UTF-8 BOM (Excel-friendly), CRLF rows, and
  attachment headers (`dust-busters-earnings-<date>.csv`). Scoped to the
  signed-in cleaner via the RLS server client; payout math mirrors the earnings
  page (stored `cleaner_payout`/`platform_fee` with a commission-rate fallback).
  Added an "Export CSV" button to the earnings header (only when jobs exist).
- **Note:** rate limiting (next in list) was skipped — it needs a shared store on
  serverless and Supabase-side auth limits (founder/infra), so it's not a clean
  unattended item; reschedule-before-deposit is a riskier matching-flow change.
- **Verify:** `tsc` clean · `next build` green (`/cleaner/earnings/export`
  compiled) · `npm test` 20/20.
- **Next up:** admin bookings date-range filter; chat message report/flag.

---

## 2026-06-30 — Knight iteration: ideation pass + LocalBusiness JSON-LD (SEO)

- **Plan hygiene:** verified + ticked three stale `[ ]` items that were already
  done — cancellation refund (cancelBooking refunds ≥24h out), Nav cleaner-profile
  link (present), and no_cleaner_found re-broadcast (0017 + "Search again").
- **Ideation pass** (actionable backlog had thinned): added IDEAS.md Batch 2 (6
  ideas, deduped) and promoted three into the plan — cleaner earnings CSV export,
  admin bookings date-range filter, chat message report/flag.
- **Shipped item — SEO:** added `HomeAndConstructionBusiness` JSON-LD structured
  data to the landing page (name, description, url, image, email, priceRange,
  serviceType, areaServed = Courtenay/Comox/Cumberland/Comox Valley, BC address).
  Code-only, invisible; improves local search + rich-result eligibility. Pairs
  with the existing sitemap/robots/OG metadata.
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` 20/20.
- **Next up:** cleaner earnings CSV export; admin bookings date-range filter.

---

## 2026-06-30 — Knight iteration: transactional email/SMS channel abstraction

- **Item:** P0 (top backlog). Build the transactional messaging channel now so the
  founder only has to add keys later.
- **Built:** `src/lib/messaging.ts` — provider-agnostic `sendEmail` (Resend REST),
  `sendSms` (Twilio REST), plus `isEmailConfigured`/`isSmsConfigured`. All sends are
  best-effort and never throw. Wired into `createNotification`: the key money/match
  notification types (cleaner_found, deposit_paid, deposit_received, balance_received,
  job_completed, booking_expired, booking_released) are mirrored to email via the
  recipient's auth email. Documented the optional env vars in `.env.example`.
- **Safety:** with no keys set, `createNotification` short-circuits before any user
  lookup or network call, so behavior is byte-for-byte identical today (verified the
  build is unchanged at runtime); it activates the instant Resend/Twilio keys land.
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` 20/20.
- **⛔ Needs the founder:** add `RESEND_API_KEY` + `RESEND_FROM` (and optionally
  the `TWILIO_*` trio) to activate email/SMS. Until then it's a safe no-op.
- **Next up:** reconcile stale items (cancellation-refund line, Nav cleaner-profile
  link, no_cleaner_found retry already shipped); then `vercel.json` + image
  remotePatterns; reschedule-before-deposit.

---

## 2026-06-29 — Knight iteration: deposit_deadline auto-expiry (migration 0029, founder-approved)

- **Item:** P1 correctness (production DB). `deposit_deadline` (column from 0008)
  was never set, so an 'accepted' booking whose customer never paid sat forever,
  holding the cleaner's slot (the accept conflict-guard treats 'accepted' as
  committed).
- **Migration 0029** (applied + verified live via the session pooler, in a
  transaction): added `settings.deposit_ttl_mins` (default 1440 = 24h, generous
  so only clearly-abandoned bookings cancel); recreated `accept_offer` identical
  to 0024 + it now stamps `deposit_deadline = now() + ttl`; added
  `expire_unpaid_acceptance(booking)` which lazily cancels an overdue-unpaid
  acceptance (status → cancelled, reason "Deposit not paid in time"), expires its
  offers, and notifies both the customer and the cleaner. Mirrors the 0019
  broadcast lazy-expiry. Enforced on read from the customer booking page and the
  cleaner jobs page.
- **Bug fixed in passing:** `accept_offer` (0024) already notifies the customer on
  accept, so the action-side accept notification added earlier this session was a
  DUPLICATE — removed it (the won/lost redirect stays; completeJob's balance
  notification stays, since complete_job does not notify).
- **Verify:** migration verified live (column present, accept_offer contains
  deposit_deadline, function exists, ttl=1440); `tsc` clean · `next build` green
  (27 routes) · `npm test` 20/20.
- **Note for founder:** `deposit_ttl_mins` defaults to 24h; tune in `settings` if
  you want quicker expiry of unpaid acceptances.

---

## 2026-06-29 — Knight iteration: a11y — live status region + nav icons

- **Item:** P3 accessibility. Booking status changes (driven by the realtime
  `StatusLive` refresh) were not announced to screen-reader users, and the nav's
  decorative icons weren't hidden from SR.
- **Fix:** the booking status sentence is now `role="status" aria-live="polite"`,
  so SR users hear "cleaner found / deposit paid / completed" as it updates;
  the Bell (desktop + mobile), Menu, and X nav icons are `aria-hidden` (their
  link/button already provides an `aria-label`). Most page-level decorative icons
  already received `aria-hidden` during the UI redesign.
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` 20/20.
- **Next up (needs founder OK — production DB):** set + lazily enforce
  `deposit_deadline` so unpaid `accepted` bookings auto-expire (rewrites the core
  `accept_offer` RPC).

---

## 2026-06-29 — Knight iteration: Terms of Service + Privacy Policy pages

- **Item:** P2 legal/trust. A payments marketplace had no Terms or Privacy pages.
- **Fix:** added `/terms` and `/privacy`, written to match how the app actually
  works — deposit/balance via Stripe, the 24h cancellation/refund window,
  address kept private until the booking is confirmed, independent-contractor
  cleaners, reviews/disputes, and data handling (Stripe for payments, Supabase
  for hosting; no card numbers stored, no data sold). Premium light layout using
  the design system, the two pages cross-link, and both are linked in the footer.
- Decision note: chose this (safe, high-trust, zero-risk) over the
  `deposit_deadline` production-DB migration, which rewrites the core
  `accept_offer` RPC and should be a focused, founder-aware iteration.
- **Verify:** `tsc` clean · `next build` green (`/terms` + `/privacy` compiled) ·
  `npm test` 20/20.
- **Next up:** a11y pass (aria-hidden decorative icons + aria-live live regions).

---

## 2026-06-29 — 📊 Milestone summary (8 Knight items shipped this run)

**Shipped + verified (tsc + next build + npm test) + pushed to
`origin/dustbusters-autonomous`:**
1. `4099566` — P0 chargeback webhook → real `disputes` schema (chargebacks were
   silently lost; now reach the admin queue, idempotent).
2. `41d3b11` — P1 notify customer on cleaner accept (pay deposit) / complete
   (pay balance).
3. `b758a3e` — P1 `SubmitButton` pending/disabled on pay + cleaner action forms
   (double-charge / double-accept guard).
4. `5c5b695` — P1 CSRF/same-origin guard on the `mark-read` POST.
5. `fc507b7` — P1 `ConfirmSubmit` confirmation on destructive admin actions
   (cancel / refund / reassign / override / verify / deactivate).
6. `316e3ad` — P1 booking timezone: parse `datetime-local` as Pacific (DST-aware),
   not server UTC. +5 unit tests.
7. `3aadd6c` — P1 cleaner live feed also reacts to `bookings` status changes
   (deposit_paid / cancel / reassign).
8. `(this commit)` — P1 accept-offer race feedback (won/lost banners).

Also reconciled several stale backlog items already fixed in earlier work (admin
`issueRefund`/0013, `start_job`/`complete_job` error surfacing). Test suite grew
15 → 20. Two new shared components: `SubmitButton`, `ConfirmSubmit`.

**Queued next (P1/P2):** `deposit_deadline` never set (needs an RPC migration via
the pooler); transactional email/SMS channel abstraction (keys are founder-only);
Terms/Privacy pages; rate limiting; reschedule-before-deposit.
**⛔ Founder-only:** `STRIPE_WEBHOOK_SECRET`, Stripe live keys, Vercel deploy,
real ID verification (Storage/Stripe Identity), Stripe Connect payouts.

---

## 2026-06-29 — Knight iteration: accept-offer race feedback (won / lost)

- **Item:** P1 feedback. `acceptJob`'s won/lost result was discarded, so a cleaner
  who lost the race (another cleaner accepted first) just saw the offer vanish
  with no explanation.
- **Fix:** `acceptJob` now redirects with `?notice=won` (after sending the
  customer's "pay your deposit" notification) or `?notice=lost`; the jobs page
  renders a success banner on a win and a friendly "another cleaner accepted
  first — new offers appear here in real time" banner on a loss.
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` 20/20.

---

## 2026-06-29 — Knight iteration: cleaner live feed reacts to booking status

- **Item:** P1 realtime correctness. `JobsLive` only subscribed to
  `booking_offers`, so when a customer paid the deposit (booking → deposit_paid)
  or a job was cancelled/reassigned, the cleaner's list stayed stale until a
  manual reload.
- **Fix:** added a second `postgres_changes` subscription on the `bookings` table
  filtered by `cleaner_id`, refreshing the route on any status change to one of
  the cleaner's assigned bookings (`bookings` is already in the realtime
  publication via the MatchingMap; RLS scopes it to the cleaner).
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` 20/20.
- **Next up:** P1 — accept-offer race result (won/lost) feedback to the loser.

---

## 2026-06-29 — Knight iteration: booking timezone (Pacific, DST-aware)

- **Item:** P1 correctness. The `<input type="datetime-local">` value has no
  timezone, and `new Date(value)` parsed it in the *server's* zone — on Vercel
  (UTC) a customer's "2:00 PM" was stored as 14:00 UTC = 7:00 AM Pacific. Every
  booking time was wrong in production.
- **Fix:** new `parseBookingDate` reads a bare local value as `America/Vancouver`
  wall-clock time, computing the correct (DST-aware) UTC instant via
  `Intl.DateTimeFormat` offsets; strings that already carry a timezone (…Z /
  ±hh:mm) are treated as absolute, so the existing Z-string tests still pass.
  `validateBooking` now uses it. Added 5 unit tests (PST winter UTC-8, PDT summer
  UTC-7, timezone passthrough, garbage).
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` 20/20.
- **Next up:** P1 — live job feed ignores the bookings table (`JobsLive.tsx`);
  accept-offer race result (won/lost) discarded.

---

## 2026-06-29 — Knight iteration: confirmation on destructive admin actions

- **Item:** P1 safety. Admin actions that are impactful or irreversible — override
  status, cancel booking, reassign cleaner, **issue refund** (real money via
  Stripe), and verify/deactivate a cleaner — fired immediately on a single click,
  with no confirmation.
- **Fix:** new shared client `ConfirmSubmit` (`components/ConfirmSubmit.tsx`) that
  asks `window.confirm(message)` before submitting and (via `useFormStatus`)
  disables + shows a pending label while the action runs. Wired into all the
  above with action-specific messages (the refund warns the money can't be
  undone; the cleaner toggles use a state-aware message).
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` 15/15.
- **Next up:** P1 — booking timezone handling (`book/actions.ts`); live job feed
  ignores the bookings table (`JobsLive.tsx`).

---

## 2026-06-29 — Knight iteration: CSRF/same-origin guard on mark-read

- **Item:** P1 security hardening. The `/api/notifications/mark-read` POST relied
  only on the auth cookie, so a malicious cross-site page could POST with the
  victim's session and mark notifications read (low impact, but a real CSRF gap).
- **Fix:** added an `isCrossOrigin` guard that returns 403 for `Sec-Fetch-Site:
  cross-site` and for any `Origin` whose host doesn't match the request `Host`,
  before the auth + RLS checks. Same-origin fetches (the only legitimate caller)
  pass unchanged.
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` 15/15.
- **Next up:** P1 — confirmation prompts on destructive admin actions.

---

## 2026-06-29 — Knight iteration: pending/disabled state on action forms

- **Item:** P1 UX + money safety. The pay-deposit/balance forms and the cleaner
  Accept/Decline/Start/Complete buttons had no pending/disabled state, so a fast
  double-click could double-submit (worst case: double-charge a deposit/balance,
  or double-accept a job).
- **Fix:** new shared client `SubmitButton` (`components/SubmitButton.tsx`) using
  `useFormStatus` — it disables itself, shows a pending label, and sets
  `aria-busy` while its parent `<form>`'s action is in flight. Wired into the
  deposit + balance pay forms and the cleaner accept/decline/start/complete
  forms. Other server-action forms can adopt it incrementally.
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` 15/15.
- **Next up:** P1 — confirmation on destructive admin actions; `mark-read`
  same-origin guard; booking timezone handling.

---

## 2026-06-29 — Knight iteration: notify the customer on cleaner accept / complete

- **Item:** P1 flow feedback. The two transitions that require the customer to
  pay — a cleaner **accepting** (deposit) and **completing** (balance) — sent no
  notification, so customers had no nudge to act (the booking could stall).
- **Fix:** `acceptJob` now notifies the customer "a cleaner accepted — pay your
  deposit to lock it in" on a successful accept; `completeJob` notifies
  "your cleaning is complete — please pay the balance". Both use the existing
  service-role `createNotification` helper in the action's success path, reading
  the booking's `customer_id`/`scheduled_at` (the cleaner is the assigned cleaner
  by then, so RLS allows the read). Added a small `shortDate()` copy helper.
- Also verified + ticked the stale P1 "`start_job`/`complete_job` swallow errors"
  item — both already log and redirect with a friendly banner via `jobsError`.
- **Verify:** `tsc` clean · `next build` green (27 routes) · `npm test` 15/15.
- **Next up:** P1 — pending/disabled state on the pay-deposit/balance +
  accept/start/complete forms (double-submit/double-charge guard).

---

## 2026-06-29 — Knight iteration: chargeback webhook → real disputes schema

- **Item:** P0 money-path correctness. The `charge.dispute.created` Stripe webhook
  inserted into `disputes` with columns that don't exist (`payment_id`,
  `stripe_dispute_id`, `reason`, `amount`), used a Stripe `status` value (not the
  4-value enum), and omitted the NOT NULL `raised_by` / `category` / `description`
  — so every chargeback insert threw, was swallowed by the handler's catch, and
  was silently lost (Stripe still got a 200). Customer chargebacks never reached
  the admin dispute queue.
- **Fix (code-only, no migration):** map the chargeback onto the real `0008`
  schema — `raised_by` = the booking's customer (the cardholder), category
  `payment_issue`, a composed `description` (Stripe reason + amount + dispute id),
  `status` `open`. Added idempotency (guards on an existing open payment_issue
  dispute for the booking, since there's no `stripe_dispute_id` column to dedupe
  on) and surfaced any insert error to the server log.
- Also reconciled the stale P0 "admin refund writes nonexistent columns" item:
  the live `issueRefund` is already correct (migration `0013`) — verified + ticked.
- **Verify:** `tsc --noEmit` clean · `next build` green (27 routes) · `npm test` 15/15.
- **Next up:** P1 — surface silent failures in `start_job`/`complete_job`; add
  pending/disabled state to the payment + accept/start/complete forms.

---

## 2026-06-28 — Audit 🟠: admin "Avg Rating" column was always blank

- **Item:** the cleaner roster aggregated ratings via `reviews.select("cleaner_id, rating")`,
  but the `reviews` table has **no `cleaner_id`** column (the cleaner is on the
  related booking) — so every rating was unattributed and the column always showed
  "—". Fixed the query to embed `bookings(cleaner_id)` and aggregate by the booking's
  cleaner (same relationship the `get_cleaner_card` RPC uses). Real averages now show.
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅
- **Next (AUDIT-FIXES-TODO):** re-add `disputed` to the status maps; matching map
  poll-resume after "Search again"; timezone parse.

---

## 2026-06-28 — Audit 🟠: cleaner-UX trio (re-applied on light)

- **Guard `/cleaner/onboard`:** it was unguarded — an existing/deactivated cleaner
  could re-run `becomeCleaner` (self-reactivate) and an admin could accidentally
  demote to cleaner. Now redirects cleaners → `/cleaner/jobs`, admins → `/admin`.
- **Finished jobs stay visible:** the "My jobs" query only included
  accepted/deposit_paid/in_progress/completed, so once a job hit `balance_paid`/
  `closed` it fell off the list — and the "rate the customer" action became
  unreachable. Added `balance_paid` + `closed` (they group under "Earlier").
- **Cleaner Profile nav link:** the built profile page had no entry point — added
  a "Profile" link to the cleaner nav.
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅
- **Next (AUDIT-FIXES-TODO):** timezone parse, admin avg-rating; re-add `disputed`
  to the status maps.

---

## 2026-06-28 — Audit 🔴: admin dispute fixes (re-applied on light)

- **Wrong Stripe intent refunded:** the refund form pinned a hidden
  `stripe_payment_intent_id` to `payments[0]`, so on multi-payment bookings the
  admin always refunded the first payment regardless of the dropdown choice. Fixed
  `issueRefund` to look up the *selected* payment (scoped to the booking, excluding
  refund rows), refund THAT intent, and validate the amount server-side (>0 and ≤
  the charged amount). Removed the stale hidden field + the misleading `max`, and
  the dropdown now excludes refund rows.
- **Booking stuck in `disputed`:** resolving/closing a dispute never released the
  booking. `updateDisputeStatus` now, on resolve/close, restores the booking
  `disputed → completed` (open_dispute only parks a *completed* booking, verified
  in 0014; guarded by `.eq("status","disputed")`).
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅
- **Next (AUDIT-FIXES-TODO):** timezone parse, cleaner-ux, admin-rating; re-add
  `disputed` to the status maps.

---

## 2026-06-28 — Audit 🔴: refund net-paid math (re-applied on light)

- **Item:** a refunded cancellation showed a **negative "Net paid"** on the booking
  receipt and **double-reduced** the admin dashboard revenue. Cause: a refund is
  recorded twice — the original deposit flips to status `refunded` (drops from a
  paid sum) AND a separate negative `refund` row is inserted for the receipt line;
  summing the negative row too subtracts the refund a second time. Fix (read-only,
  refund storage unchanged): exclude `type = 'refund'` from both aggregates — the
  booking `netPaid` filter and the admin `totalRevenue` query. A refunded deposit
  now nets to $0.00; revenue is net-of-refunds, counted once, never negative.
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅
- **Next (AUDIT-FIXES-TODO):** timezone parse, admin-dispute, cleaner-ux,
  admin-rating; re-add `disputed` to the status maps.

---

## 2026-06-28 — UI reverted to light + RLS security holes closed (0028)

- **Founder asked for a white UI** (the dark redesign also broke the admin layout):
  reverted commit `920c067` → back to the clean light theme across all interior
  pages (re-applied the local MessagePanel hydration fix). Landing/login stay dark
  (separate earlier redesign). The session's audit logic fixes are saved in
  `docs/AUDIT-FIXES-TODO.md` to re-apply on light.
- **Audit 🔴 — RLS security (migration `0028`, applied + verified):**
  `booking_messages`/`disputes` INSERT now require booking participation (were
  REST-bypassable); the verification trigger now pins `active` so a suspended
  cleaner can't self-reactivate via REST; added the missing `cleaner_update` WITH
  CHECK. Kept the 0026 `service_role` guard. Confirmed live policy names matched
  before applying (permissive policies OR — a mismatch would've left the hole).
  No app-code change (legit flows use SECURITY DEFINER RPCs).
- **Commits now authored as Utsav Kampanwala <kampanwalautsav55@gmail.com>** (per
  founder; saved to memory).
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅
- **Next:** re-apply refund-math, timezone, admin-dispute, cleaner-ux, admin-rating
  on light; re-add `disputed` to the status maps.

---

## 2026-06-28 — Audit 🔴 #1: double-charge guard (money integrity)

- **Item:** the audit found a deposit/balance could be charged twice — the webhook
  records on `stripe_session_id`, so a rapid second click during the webhook-lag
  window (before the page advances) creates a *new* session and charges again.
  Two-part fix in `payment-actions.ts`: (1) before creating a checkout, bail if a
  `paid` payment of that `(booking_id, type)` already exists; (2) pass a Stripe
  **idempotency key** (`checkout_<booking>_<type>_<10min-bucket>`) so duplicate
  session-creates dedupe at the source instead of double-charging. The 10-minute
  bucket keeps dedup tight but avoids a stale-session lockout on a genuine retry.
  No migration / no refund-flow changes.
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅
- **Next:** audit 🔴 — refund net-paid math, `disputed` status maps, the RLS
  migrations, timezone parse; then the post-accept page.

---

## 2026-06-28 — 🎨 Futuristic dark redesign of the whole app (multi-agent)

- **Founder request:** make every page modern/futuristic via multi-agent (one
  agent per page) + a verify agent per page.
- **How:** a 47-agent workflow — Foundation (1 agent: extended `globals.css` with a
  shared design system — dark canvas, `surface-card`, `input-dark`, `table-dark`,
  `pill-*`, `page-header`, glows; single writer) → Redesign (22 agents, one per
  interior page, edit-in-place, logic preserved) → Verify (22 agents, one per page).
  **Verify result: avg 8.6/10, 8 great / 11 good / 4 needs-fixes.**
- **Reconciled the 4 needs-fixes + leftovers myself:** rebuilt the `cleaner/jobs`
  page (its redesign agent died mid-edit → fixed the `STATUS_COLOR` build break +
  dispatched a fresh agent for a full dark pass); **re-added the dropped review
  status-gate** (real regression — a direct URL could review an in-flight booking);
  dark-themed BOTH `MessagePanel`s (local customer + shared cleaner) **and applied
  the hydration mount-gate to the local one** (the actual file behind the founder's
  hydration error); `input-dark` on the admin filters/AdminSearch; dark `Skeleton`
  loaders + `error`/`not-found` pages.
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅
- **Next:** build the council's post-accept page; start the audit's 🔴 list
  (timezone, double-charge, refund math, `disputed` maps, RLS migrations).

---

## 2026-06-28 — Crash-hardening sweep (cont.): review submissions

- **Item:** the throw-crash pattern on the next lifecycle step. `submitReview`
  (customer→cleaner) and `submitCustomerReview` (cleaner→customer) both threw on a
  **duplicate review** (one-per-booking unique constraint) or a missing/invalid
  star rating → crash. Made both: validate the rating (1–5) and bail gracefully if
  none picked; on insert error (incl. duplicate) **log + return to the page** which
  reflects the real "already reviewed" state instead of crashing. Added a
  `reviewError` banner on the booking page (shares the payError slot).
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅
- **Next:** harden cancel / dispute / report actions + surface start_job /
  complete_job errors (still the same sweep).

---

## 2026-06-28 — 🐛 "no jobs in cleaner account" — broadcast window too short

- **Founder-reported:** verified the cleaner, but no jobs showed. **Diagnosed via
  live data:** the cleaner ("cleaner") was correctly verified/active/accepting and
  serves Courtenay; the booking had 2 rung offers — **but its
  `broadcast_expires_at` was a day old**, so the search window had expired and the
  cleaner-side view (correctly) hides expired-window offers. Root cause: the
  broadcast TTL was **5 minutes**, far too short for a scheduled-cleaning
  marketplace — offers vanished before a cleaner realistically saw them.
- **Fix:** migration `0027` bumps `broadcast_ttl_mins` (default + live row) to
  **1440 min (24h)** so a search stays open. Updated `Countdown` to format long
  windows readably ("2d 3h" / "5h 12m" / "4:09"; red only in the final 5 min).
  Applied + verified (`broadcast_ttl_mins = 1440`).
- **⚠️ For the founder's stuck booking `815ba8ca`:** the *new* TTL only applies to
  new/re-broadcast searches. Open that booking (lazy-expiry flips it to
  no_cleaner_found) → **Search again** → the verified cleaner gets a fresh 24h
  offer and appears in the cleaner account.
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅

---

## 2026-06-28 — Harden the payment flow against crashes (money path)

- **Item:** the recurring throw-crash pattern, applied to the highest-risk
  next-click — **Pay deposit / Pay balance**. `startCheckout` threw on a stale
  state ("not payable right now"), a missing booking, or any Stripe API error →
  crashed to the global error boundary mid-payment. Rewrote it to **redirect back
  to the booking with a friendly `?payError=` message** instead (kept `redirect()`
  out of the try/catch so `NEXT_REDIRECT` still propagates; the Stripe call is
  wrapped and falls back to a "couldn't start checkout, try again" message). Added
  a red `payError` banner on the booking page.
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅
- **Next:** surface errors in `startJob`/`completeJob` (currently swallowed);
  harden remaining review/dispute/report actions (duplicate-submit → crash).

---

## 2026-06-28 — 🐛 Admin "Verify cleaner" did nothing (another 0009 side-effect)

- **Founder-reported:** clicking Verify in admin didn't verify the cleaner.
  **Root cause:** `setCleanerVerified` writes `id_verified` via the service-role
  client, but the `0009` `enforce_cleaner_verification_admin_only` trigger forced
  `id_verified` back to its old value whenever `NOT is_admin()` — and `is_admin()`
  is **false for the service role** (its `auth.uid()` is null), so the verify was
  silently reverted. Migration `0026` lets the trigger also accept the trusted
  service role (`auth.role() = 'service_role'`); authenticated non-admins still
  can't self-verify. **Empirically confirmed** in a rolled-back tx: `auth.role()`
  = `service_role` and the `id_verified` write now sticks. Also hardened
  `setCleanerVerified` / `setCleanerActive` to surface DB errors instead of
  silently no-op-ing.
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅
- **Next:** broad server-action throw-crash audit (the recurring pattern) — harden
  the remaining user-facing actions.

---

## 2026-06-28 — 🐛 "Search again" crash + notify-on-accept

- **Founder-reported crash:** clicking "Search again" threw *"Only a booking with
  no cleaner found can be re-broadcast"* → error boundary. Race: after a successful
  re-broadcast the booking is `broadcasting`, but the client button lingers ~2.5s
  until the next poll, so a second click hit `rebroadcast_booking` in the wrong
  state. **Fix:** migration `0025` makes it idempotent — re-ring while
  `broadcasting` OR `no_cleaner_found`, resolve status from the count, reject only
  committed/terminal states. Also made `rebroadcastBooking` log-and-revalidate
  instead of throwing (the map re-polls to truth). Applied + verified.
- **Gap fix (committed `…`):** `accept_offer` now inserts a "Cleaner found! 🎉"
  notification for the customer (migration `0024`) — previously a customer who
  left the map never learned a cleaner accepted.
- **⚠️ Note for testing:** a freshly-onboarded cleaner is `id_verified = false`,
  and dispatch only rings **verified** cleaners. To make a test cleaner matchable,
  verify them in **/admin → cleaners**. (Working as designed — the trust gate.)
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅

---

## 2026-06-28 — 🐛 Regression fix: cleaner onboarding was broken (+ admin margins)

- **Founder-reported:** picking areas on "Become a cleaner" and submitting just
  bounced back to the onboard page. **Root cause = my own `0009` security trigger**:
  it blocked *every* role change by non-admins, so `becomeCleaner`'s
  `role: customer→cleaner` was silently rejected → role stayed `customer` →
  `/cleaner/jobs` bounced them back to `/cleaner/onboard`. Migration `0023`
  narrows the trigger: a non-admin may self-switch customer↔cleaner but still
  can NOT grant themselves `admin` (escalation protection intact). Also hardened
  `becomeCleaner` to surface DB errors instead of failing silently. Applied +
  verified live.
- **Also this firing (already pushed `de5acf3`):** admin dashboard revenue card
  now breaks out realized **platform commission** vs **cleaner payouts** (from
  settled bookings' stored split) — real margin visibility for the operator.
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅

---

## 2026-06-28 — Knight iteration: booking special instructions

- **Item:** customer scope/instructions on a booking ("focus on the kitchen",
  "pets inside", access notes). Migration `0022` adds `bookings.notes` + a 6th
  `request_booking` param `p_notes` (recreates the 0021 body; trims/nulls empty).
  `/book` gets an optional "Special instructions" textarea; the cleaner sees it on
  the job page **after the deposit is paid** (same privacy gate as the address).
- **DB:** 0022 applied via pooler, verified (notes column + 6-arg signature).
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅
- **Next:** reschedule; aria-live; or fresh ideation.

---

## 2026-06-28 — Bugfix + feature: booking form crash + book-a-favorite

- **🐛 Founder-reported crash:** picking a too-soon date (or any invalid input) on
  /book threw `new Error(...)` from the server action → crashed to the global
  error boundary ("Something went wrong"). Fixed: the booking form is now a client
  `BookingForm` using `useActionState`; `submitBooking` returns `{error}` (shown
  inline) instead of throwing, inputs are preserved, and the submit button shows a
  pending state.
- **✅ Favorites 2b — book-a-favorite:** migration `0021` adds an optional
  `p_preferred_cleaner` to `request_booking` (drops the old 4-arg, recreates the
  0015 body + a branch: ring only the requested cleaner if eligible, else
  broadcast). `/book` shows a "Cleaner" select listing the customer's favorites
  when they have any. Applied + verified (single 5-arg signature).
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅

---

## 2026-06-27 — Knight iteration: customer rating on the admin profile

- **Item:** complete the two-way-review payoff. The admin customer profile now
  shows the customer's overall rating (`get_customer_rating`) and a "Reviews from
  cleaners" card (rating + comment + date, read via the admin RLS path). Also
  fixed this page's stale `pending`/`confirmed` status-color map → real
  `booking_status` values (the last copy of that bug).
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅
- **Next:** favorites 2b (book-a-favorite); P3 polish (aria-live, vercel.json).

---

## 2026-06-27 — Knight iteration: two-way reviews

- **Item:** trust & safety. Reviews were customer→cleaner only. Migration `0020`
  adds a `customer_reviews` table (one per booking; RLS: only the assigned cleaner
  can insert, and only once the job is `completed/balance_paid/closed`; the
  cleaner, the reviewed customer, and admins can read) + a `get_customer_rating`
  SECURITY DEFINER RPC. The cleaner job detail page now shows the customer's
  overall rating and a "Rate the customer" form (reuses the StarRating component +
  optional notes), hidden once submitted.
- **DB:** 0020 applied via pooler, verified (table + RPC).
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅
- **Next:** surface customer rating on the admin customer profile; favorites 2b
  (book-a-favorite); P3 polish.

---

## 2026-06-27 — Knight iteration: cleaner-side stale-offer expiry + 📊 milestone

**This iteration:** completed the lazy-expiry feature symmetrically. The cleaner
jobs page now hides open offers whose `broadcast_expires_at` has passed AND calls
`expire_booking_if_stale` on those bookings — so an abandoned broadcast that the
customer never reopens still gets closed to `no_cleaner_found` (it was only
flipped from the customer page before). Verify: tsc clean · vitest 15/15 · build 27/27.

### 📊 Milestone summary (~8 items since the last)
All verified, DB items applied live:
- offer-card take-home + countdown · favorite cleaners (toggle + list) · cleaner
  "Today" grouping · saved addresses (0018) · **lazy broadcast expiry (0019)** +
  cleaner-side · extracted & tested money-path logic (refund window + booking
  validation → 15 tests) · CI workflow + Node engines · OG metadata · admin search.

**Backlog now:** mostly P3 polish + a few medium features (favorites 2b
book-a-favorite, two-way reviews, in-app tip) + ideation. **Founder-gated
(unchanged):** dispatch cron, real ID verification, transactional email/SMS keys,
Stripe live keys/webhook, NEXT_PUBLIC_BASE_URL, Vercel deploy, rotate service-role
key + DB password.

---

## 2026-06-27 — Knight iteration: testable booking validation

- **Item:** continue test coverage. Extracted the **booking input validation**
  (valid date, ≥15 min lead, hours 1–12 integer, area whitelist, non-empty
  address) — previously inline in `book/actions.ts` — into a pure
  `validateBooking()` in `src/lib/booking.ts`, refactored the action to use it,
  and added 6 branch tests. Suite is now **15 tests / 2 files**.
- **Verify:** `tsc` clean · `npm test` 15/15 · `next build` 27/27. ✅
- **Next:** favorites 2b (book-a-favorite); two-way reviews; cleaner-side stale
  offer expiry.

---

## 2026-06-27 — Knight iteration: testable refund-window logic

- **Item:** expand test coverage (the CI gate now runs `npm test`, so tests guard
  every change). Extracted the **money-path cancellation refund-window logic** —
  previously inline + untested in `cancel-actions.ts` — into a pure
  `src/lib/booking.ts` (`hoursUntil`, `isDepositRefundable`, `FREE_CANCEL_HOURS`),
  refactored the cancel action to use it, and added boundary tests (exact 24h,
  within window, past, custom window). Suite is now **9 tests / 2 files**.
- **Verify:** `tsc` clean · `npm test` 9/9 · `next build` 27/27. ✅
- **Next:** extract + test the booking input validation; favorites 2b; two-way
  reviews.

---

## 2026-06-27 — Knight iteration: lazy broadcast expiry (closes the timeout loop)

- **Item:** `broadcast_expires_at` + the offer countdown existed, but nothing
  enforced the timeout — a booking sat in `broadcasting` forever, and the
  "Search again" / re-broadcast flow never triggered on its own. Without a cron,
  added `expire_booking_if_stale(booking_id)` (migration `0019`, applied +
  verified): flips a past-window `broadcasting` booking to `no_cleaner_found` and
  expires its still-`rung` offers. The booking page calls it on read, so the map's
  no-cleaner state + "Search again" now appear automatically when the window ends.
  Safe to call by anyone (only ever enforces the real timeout).
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 27/27. ✅
- **Next:** call expiry on the cleaner side too (drop stale open offers);
  favorites phase 2b (book-a-favorite). The full proactive `dispatch_tick` cron
  (+ deposit_deadline enforcement) still needs founder cron setup.

---

## 2026-06-27 — Knight iteration: favorites list (phase 2a)

- **Item:** P2. The favorite toggle (phase 1) had no payoff surface. Added a
  "Favorite cleaners" card to the account page — each favorite shows the cleaner's
  card (name · ⭐avg_rating · verified · jobs completed, via `get_cleaner_card`)
  with a one-tap remove (`removeFavorite` action). Only shown when the customer
  has favorites.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 27/27. ✅
- **Next:** phase 2b — book-a-favorite (direct/priority offer to a saved cleaner);
  reschedule.

---

## 2026-06-27 — Knight iteration: saved addresses

- **Item:** P2 (from ideation). Customers re-typed their address every booking.
  Migration `0018` adds a `saved_addresses` table (RLS-scoped select/insert/delete
  to the owner). Account page gets a "Saved addresses" card (add with optional
  label, delete). `/book` gets a JS-free `<datalist>` autocomplete on the address
  field sourced from the customer's saved addresses.
- **DB:** 0018 applied via pooler, verified (table + 3 policies).
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 27/27. ✅
- **Next:** Favorites phase 2 (list + book-a-favorite); reschedule.

---

## 2026-06-27 — Knight iteration: cleaner "Today" schedule grouping

- **Item:** P2 (from ideation). The cleaner's "My jobs" list was a flat list.
  Grouped it by day — **Today / Upcoming / Earlier** (by `scheduled_at`) with a
  count per group — so a cleaner can see what's on for today at a glance. Pure
  presentational (data already fetched); the job-card markup is unchanged.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 27/27. ✅
- **Next:** saved addresses, Favorites phase 2 (list + book-a-favorite).

---

## 2026-06-27 — Knight iteration: favorite cleaners (phase 1) + ideation

- **Ideation pass** (backlog was thin on high-value items): added Batch 1 to
  `docs/IDEAS.md` (favorites phase-2, reschedule, saved addresses, cleaner Today
  view, in-app tip, two-way reviews) and promoted 4 into the plan.
- **Shipped:** activated the **stranded `customer_favorites` table** (full
  schema + RLS existed, zero src usage). Added a heart toggle on the booking
  detail page's cleaner card (`toggleFavorite` action — RLS-scoped insert/delete);
  filled rose heart when favorited, with aria-label/aria-pressed.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 27/27. ✅
- **Next:** Favorites phase 2 (list + book-a-favorite), saved addresses, cleaner
  Today view.

---

## 2026-06-27 — Knight iteration: offer-card countdown + take-home + 📊 milestone

**This iteration:** open-offer cards now show the cleaner's **take-home**
(`cleaner_payout`) as the headline amount (gross as subtext) and a live
**"Expires in m:ss"** countdown (`Countdown` client component, fed by
`broadcast_expires_at`; renders nothing until mounted to avoid hydration
mismatch; turns red under 1 min). Verify: tsc clean · vitest 3/3 · next build 27/27.

### 📊 Milestone summary (~10 items since the last milestone)
P2 fully cleared + into P3, all verified (+ founder UI requests):
- OG/social metadata + branded OG image · admin list search/filter · star-rating
  review UI · README + .env.example · mark-notification-read-on-click · "Book
  again" prefill · payment receipt on the booking page · skip-to-content (a11y) ·
  CI workflow + Node engines · offer-card countdown + take-home.
- Founder visual requests: how-it-works equal-height cards · dark/futuristic login ·
  founder-spec landing background.

**Remaining:** P3 — aria-hidden on remaining decorative icons + aria-live;
`vercel.json`; image `remotePatterns`; static-gen for marketing; expand test
coverage. **Founder-gated (unchanged):** dispatch cron, real ID verification,
transactional email/SMS keys, Stripe live keys/webhook, NEXT_PUBLIC_BASE_URL,
Vercel deploy, rotate service-role key + DB password.

---

## 2026-06-27 — Knight iteration: CI workflow + Node engines

- **Item:** P3 dev quality. Added `.github/workflows/ci.yml` — on push to
  main/dustbusters-autonomous + PRs, runs `npm ci` → typecheck → unit tests →
  production build on Node 20. Uses dummy env vars so the build needs no secrets
  (verified: all routes are dynamic and sitemap/robots/OG don't touch Supabase, so
  nothing hits the network at build). Pinned `engines.node >= 20` in package.json.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 27/27 · package.json
  valid. ✅
- **Next:** aria-hidden on remaining decorative icons + aria-live; offer-card
  expiry countdown; `vercel.json`; then more ideation per the loop.

---

## 2026-06-27 — Knight iteration: skip-to-content link (a11y)

- **Item:** P3 a11y. Keyboard/screen-reader users had no way to bypass the nav.
  Added a "Skip to content" link as the first focusable element in the layout
  (`sr-only` until focused, then a visible pill) that jumps to `#main-content`
  (added to the children wrapper).
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 27/27. ✅
- **Next:** aria-hidden on remaining decorative icons + aria-live for live status;
  offer-card expiry countdown; CI workflow; vercel.json.

---

## 2026-06-27 — Knight iteration: payment receipt on the booking page

- **Item:** P2. Customers had no record of what they'd paid. Added a "Payments"
  receipt section to the booking detail page: an itemized list of each payment
  (Deposit / Balance / Refund) with date, status, and amount (refunds shown
  negative), plus a **Net paid** total. Fetched from the `payments` table (RLS
  scopes it to the customer's own booking); only shown when payments exist.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 27/27. ✅
- **Next:** P3 polish — a11y skip-to-content link, decorative-icon aria-hidden,
  offer-card expiry countdown + net take-home; CI workflow; vercel.json.

---

## 2026-06-27 — Knight iteration: "Book again" prefill

- **Item:** P2. A "Book Again" button already existed on finished bookings but
  linked to a blank `/book`. Now it passes `?hours=<n>&area=<area>`, and `/book`
  reads + validates those params (hours 1–12, area in the whitelist) to prefill
  the `PriceEstimator` hours and the area `<select>`. Address is deliberately NOT
  passed in the URL (privacy). One-tap re-book of a prior cleaning.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 27/27. ✅
- **Next:** payment receipts, then P3 polish (a11y skip-link, CI, vercel.json) and
  continued ideation per the loop.

---

## 2026-06-27 — Knight iteration: mark-notification-read-on-click

- **Item:** P2. Notifications could only be cleared via bulk "Mark all read".
  Added a `markRead(id, bookingId)` action and made each notification a full-row
  clickable form: clicking marks it read and, if it has a `booking_id`, redirects
  to that booking (otherwise just clears the unread highlight). Bulk "Mark all
  read" kept. (RLS scopes the update to the user's own rows.)
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 27/27. ✅
- **Next:** "Book again" prefill; payment receipts; then P3 polish (a11y skip-link,
  CI, vercel.json) and continued ideation.

---

## 2026-06-27 — Founder fixes: How-it-works card alignment + login redesign

1. **How-it-works cards unaligned** (founder screenshot): cards had unequal
   heights and the bottom chips didn't line up. CSS-only fix: `.hiw-card` now
   `flex: 1` + flex-column so all three fill the grid-stretched column (equal
   height), and `.hiw-card > div:last-child { margin-top: auto }` pushes the
   accent tags to a common baseline.
2. **Login page redesign** (founder: "looks 90s — make it modern/futuristic, on
   theme"): replaced the plain white card with the dark Dust Busters theme — an
   `.auth-shell` (teal→navy radial) with aurora glows, a glassmorphic `.auth-card`,
   dark `.input-dark` fields, the gradient brand mark, and the glowing CTA button.
   All auth logic (signup/confirm, show-password, forgot-password, autocomplete)
   preserved.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 27/27. ✅

---

## 2026-06-27 — Knight iteration: README + .env.example

- **Item:** P2 deploy-readiness docs. The README was one line ("Dust Buster! Lets
  GO!!!!") and there was no env template. Added:
  - `.env.example` — every required var (Supabase URL/anon/service-role, Stripe
    secret/publishable/webhook, NEXT_PUBLIC_BASE_URL) with placeholders + notes,
    no secrets. Added a `!.env.example` exception to `.gitignore` (which ignores
    `.env*`) so the template is tracked.
  - `README.md` — stack, prerequisites, setup, run scripts, migrations (incl. the
    pooler caveat), first-admin SQL, booking status flow, Vercel deploy steps, and
    a docs index.
- **Verify:** `git check-ignore` confirms `.env.example` is tracked · `tsc` clean ·
  `next build` 27/27. ✅
- **Next:** mark-notification-read-on-click, "Book again" prefill, payment receipts.

---

## 2026-06-27 — Knight iteration: star-rating review UI

- **Item:** P2. The review form was off-brand (plain select + textarea + blue
  button, no stars). Added an interactive `StarRating` client component (5 stars,
  hover preview, labels Terrible→Excellent, a11y radiogroup, posts a hidden
  `rating` input) and rebranded the review page (card, back link, branded button,
  friendly copy, optional comment). The `submitReview` action is unchanged.
- **Verify:** `tsc` clean · `npm test` 3/3 · `next build` 27/27. ✅
- **Next:** mark-notification-read-on-click, "Book again" prefill, README +
  .env.example, payment receipts.

---

## 2026-06-27 — Founder-spec landing background refinement

The earlier council fix flattened everything to transparent; the founder wanted
the opposite — tasteful per-section ambience with smooth transitions. Implemented
their exact spec (replaces the "unified transparent" block):
1. **Pricing:** `.price-section { overflow: hidden }`; auras pulled inside the card
   — repositioned to top-left 10%/20% and top-right 90%/20%, sized 40%, opacity
   0.35, animation off (no more hard color blocks on raw dark bg).
2. **Hero→next fade:** `.hero-shell` keeps a soft teal radial + a `::after`
   `linear-gradient(transparent 70%, #070b14)` 200px bottom fade (clean blend).
3. **Mid sections:** subtle centered radial glows on hiw/trust/assure/area
   (rgba ~0.03–0.04) so they're not flat voids.
4. **CTA:** glow flipped to fire from the top (`at 50% -20%`, emerald 0.12) so it
   connects to the flow above.
5. **Grain overlay:** page-wide `feTurbulence` SVG noise at 4% on `<main>`
   (`.landing-grain::before`, fixed, pointer-events none) to unify boundaries.
- **Verify:** `tsc` clean · `next build` 27/27. ✅

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
