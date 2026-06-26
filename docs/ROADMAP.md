# Dust Busters — Production Roadmap

> Owner: Product Lead · Market: Comox Valley, BC (Courtenay / Comox / Cumberland) · Price: CAD $20/hr
> Stack: Next.js 16.2.9 (App Router, TS) · React 19.2.4 · Supabase (Postgres/Auth/Realtime/RLS) · Stripe · Tailwind v4 · lucide-react · **no map library yet**
> Migrations through `0008_*`; next number is `0009`.

This roadmap merges and de-duplicates ~70 ideas from six product/tech lenses (Customer, Cleaner/Supply, Trust & Safety, Monetization & Growth, Operations & Matching) plus the dedicated Uber-style cleaner-map UX design and technical plan. Every item below was checked against the real code; the "Grounding" notes cite what's actually true in the repo today.

## Tiers

- **P0 — production blocker.** Either actively broken/lying in a way that creates a legal, trust, or cash-collection failure, or table-stakes the marketplace cannot operate without. Ship before/with launch.
- **P1 — flagship.** The Uber-style live cleaner-map matching experience the founder wants. See `docs/specs/uber-cleaner-map.md` for the buildable spec.
- **P2 — high-value.** Strong LTV / supply / ops levers to schedule across the first 1–2 sprints after launch.
- **P3 — nice-to-have.** Real value, but defer until the above are solid.

Effort scale: trivial (<½ day) · small (½–2 days) · medium (2–5 days) · large (1–3 weeks).

---

## What we verified in the code (the honest baseline)

These confirmed facts drive the P0 list — several user-facing promises are currently unbacked:

1. **Reviews query is broken.** `src/app/bookings/[id]/page.tsx:104` filters `reviews.reviewer_id`, but the `reviews` table (`0006_reviews.sql`) has **no `reviewer_id` column**. The `hasReview` check silently fails, so the review prompt can re-appear after a review is left. Real correctness bug.
2. **No scheduler exists anywhere.** Grep finds no cron / `pg_cron` / scheduled function. Therefore `offer_state='expired'` is never set, `bookings.deposit_deadline` (added in `0008`) is **never written or enforced**, and the jobs UI copy "Accept within the offer window!" refers to a window that does not exist.
3. **`accept_offer` has no double-booking guard.** It only checks booking status + offer existence (`0003_booking.sql`). A cleaner can accept two overlapping jobs → guaranteed no-show.
4. **The 15% fee + "Friday direct deposit" is theatre.** `PLATFORM_FEE_RATE` is a display-only constant in `cleaner/earnings/page.tsx`; no commission is stored and there is **no payout rail** — yet the page tells cleaners they're paid weekly by direct deposit.
5. **The "ID-verified" badge is unaudited.** `cleaner_details.id_verified` is flipped by an admin with zero document capture, while the booking page renders a green "ID-verified" badge and `/book` claims cleaners are "background-checked."
6. **The 24h refund policy is copy-only.** `cancel_booking` (`0008`) just sets `status='cancelled'`; it never checks timing or issues a Stripe refund. Money + chargeback liability.
7. **`open_dispute` is customer-only** (`v_booking.customer_id != auth.uid()` → raise). A lone cleaner in a stranger's home cannot report a no-show, unsafe conditions, or harassment.
8. **`customer_favorites` is fully stranded.** The table + RLS exist (`0008`) but have **zero references in `src/`**. The continuity/loyalty backend is built and unused.
9. **Notifications are in-app only.** `createNotification()` (`src/lib/notifications.ts`) inserts a row; there is no email/SMS. The deposit→balance cash flow depends on the customer acting on prompts they only see when on-site.
10. **Cleaners have no coordinates.** Only `cleaner_details.areas_served` (3 town buckets). Dispatch (`request_booking`) rings **every** active+verified cleaner in the area regardless of schedule or distance — a wall of declines.

---

## P0 — Production blockers (do first)

| # | Item | Effort | Grounding / why it blocks launch |
|---|------|--------|----------------------------------|
| P0.1 | **Fix the reviews schema + broken query** | trivial | Add `reviewer_id uuid` to `reviews` (or correct the page query) so `hasReview` works. Unblocks two-way reviews later. Pure correctness. |
| P0.2 | **Dispatch scheduler heartbeat (`dispatch_tick` + cron)** | medium | The shared time-source the app is missing. One `SECURITY DEFINER dispatch_tick()` run every 30–60s (Supabase `pg_cron` or a Vercel cron hitting a service-role route) that: expires stale `rung` offers (`offer_state='expired'`), **enforces `deposit_deadline`** (release the cleaner + re-broadcast/cancel), expires `broadcast_expires_at` → `no_cleaner_found`, and emits reminder/SLA hooks. Enables P0.5, the map's honest timeout, reminders, recurring, abandoned-deposit recovery. |
| P0.3 | **Schedule-conflict / double-booking guard** | small | In `request_booking` (offer fan-out) and again inside `accept_offer`, exclude/reject any cleaner whose existing active job `[scheduled_at, scheduled_at+hours]` overlaps (plus travel buffer). Add a partial index on `(cleaner_id, scheduled_at)`. Fixes a real no-show bug. |
| P0.4 | **Cleaner self-serve Online/Offline toggle** | small | Add `cleaner_details.accepting_jobs bool` (distinct from admin-only `active`) and append `and cd.accepting_jobs` to the dispatch `WHERE`. One-line dispatch change; table-stakes gig retention so cleaners aren't spammed while sick/booked. |
| P0.5 | **Enforced cancellation windows + automatic Stripe refunds** | medium | Make `cancel_booking` timing-aware: >24h → full deposit refund via the existing service-role refund path; <24h → forfeit/partial; record the outcome and show the exact refund at cancel time. The UI already promises this policy. Removes chargeback/legal exposure. |
| P0.6 | **Formalize platform commission in data + honest money copy** | medium | Add `settings.commission_percent`; compute and persist `platform_fee` + `cleaner_payout` per booking inside `request_booking`; surface real platform revenue in admin. **Until Connect (P2) ships, correct the earnings page copy** so it doesn't claim automated Friday direct deposit that doesn't happen. Precondition for all monetization. |
| P0.7 | **Real ID verification (document upload + admin review)** | medium | Replace the blind boolean: private Supabase Storage bucket for govt ID + selfie captured at onboarding; admin reviews docs before flipping `id_verified`. Recommended upgrade: Stripe Identity `VerificationSession` + webhook (same vendor already wired). Makes the "ID-verified" / "background-checked" claims true. |
| P0.8 | **Transactional email/SMS on money + match events** | medium | Extend the single `createNotification()` choke point to also send email (Resend) and SMS (Twilio; `profiles.phone` exists) for "cleaner found — pay deposit", "job complete — pay balance", "leave a review". Cash collection depends on off-site nudges. Add channel prefs + unsubscribe. Foundation for all lifecycle/win-back. |
| P0.9 | **Cleaner-side issue reporting (two-way disputes + SOS hook)** | small | Generalize `open_dispute` so the assigned cleaner can raise issues (customer no-show, unsafe home, harassment, access denied) into the same admin queue; add a "Report a problem" action on the cleaner job page. Lone-worker safety is a defining T&S obligation. |

**P0 sequencing:** P0.1 → P0.2 (scheduler, unblocks much) → P0.3/P0.4 (cheap correctness + supply) → P0.5/P0.6 (money integrity) → P0.7/P0.8/P0.9 (trust/safety/comms). Then ship P1.

---

## P1 — Flagship: the Uber-style live cleaner map

| # | Item | Effort | Grounding / why |
|---|------|--------|-----------------|
| P1.1 | **Live cleaner-map matching ("Finding your cleaner")** | medium | A full-bleed takeover state of `/bookings/[id]` while `status ∈ {broadcasting, accepted, no_cleaner_found}`: a real map centered on the customer's town, **fuzzed** pins for every cleaner who got a real `booking_offers` row, live "N notified · M deciding" counts, a radar/pulse, and a winner reveal that locks one pin and slides up the confirmed-cleaner card. It is a **presentation layer** over the existing dispatch — no new matching algorithm, no fake GPS, no fake ETA. Full buildable spec (migration `0009`, RPC contract, components, realtime, privacy, edge cases) in **`docs/specs/uber-cleaner-map.md`**. Soft-depends on P0.2 for the honest broadcast-timeout. |
| P1.2 | **Live dispatch transparency (counts) — map-optional** | small | The "12 notified · 8 deciding · still searching" status, driven by `count(booking_offers)` + offer-state transitions, delivered through the same `get_booking_matching` RPC. Ships *inside* P1.1 but degrades gracefully to a text-only card when the map can't load or supply is thin — so the honesty/reassurance value lands even without tiles. |

> **Why now (founder ask):** the Uber feel here is *real* — `request_booking` genuinely broadcasts to every verified cleaner, first-accept-wins is genuinely the "a driver accepted" moment, and the counts are genuinely true. We get the suspense from motion + live status, not invented telemetry. See the spec's §"honesty contract."

---

## P2 — High-value (first sprints post-launch)

### Customer growth & retention
| Item | Effort | Grounding / why |
|------|--------|-----------------|
| **Saved Homes (address book)** | small | New `customer_addresses` (label, full_address, area, access notes, RLS owner-only). Swaps `/book`'s raw text field for "pick a saved home or add new." Biggest repeat-friction remover; unblocks one-tap re-book + recurring. |
| **One-tap Re-book with prefill** | trivial | The existing "Book Again" CTA (`BOOK_AGAIN_ALLOWED`) opens a blank `/book`; carry prior area/hours/address/add-ons via query params or a clone-and-broadcast action. Data is already on the booking row. |
| **Wire up `customer_favorites` (toggle + favorites-first dispatch tier)** | medium | Heart toggle on the post-job cleaner card, a Favorites list on `/account`, and an "offer my favorites first" exclusive window before the area broadcast. Activates a fully-built, totally-unused table. Folds "favorite cleaners", "book same cleaner direct", and the ops "favorite priority tier" into one. |
| **Recurring / standing bookings (weekly/biweekly/monthly) + discount** | large | `recurring_plans` + the P0.2 scheduler auto-creates/broadcasts the next occurrence; optional lock to a favorite cleaner. The single biggest LTV lever for cleaning. Deps: P0.2, Saved Homes, Favorites. |
| **Add-on services / service tiers (deep clean, oven, fridge, windows, move-out)** | large | `services` + `booking_addons`; `/book` checkboxes; fold flat price/extra time into `request_booking`'s total/deposit/balance; itemized payment card. Raises AOV; feeds SEO pages. (Merges Customer "add-ons" + Monetization "service tiers".) |
| **"On my way" + ETA status (no map)** | small | Day-of cleaner action sets `en_route` + ETA; customer sees "Maria is on her way — ~9:15am" + notification. Reuses StatusLive + notifications. Delivers ~80% of "live tracking" value with zero map/GPS. |
| **Special instructions + entry/access details** | small | `notes` + `access_instructions` on the booking, masked until deposit via the proven `booking_addresses` RLS pattern. Avoids day-of lockouts. |
| **Instant / "Today ASAP" booking presets** | small | Quick-pick chips (ASAP / Today PM / Tomorrow AM / Weekend) over the datetime field; flag instant bookings with an urgency badge. No schema change for the basic version. |
| **Tipping** | medium | New `tip` payment_type + a tip step on the review screen (preset 10/15/20%/custom) reusing the Stripe Checkout+webhook pattern; 100% to the cleaner, shown in earnings. |
| **Receipts & booking summary (view + emailed)** | small | Itemized per-booking receipt (service, hours, cleaner, deposit+balance+tip), printable, emailed on `balance_paid`. Additive read layer; deps P0.8 for email. |
| **Promo codes & first-clean intro offer** | small | MVP: `allow_promotion_codes` on Checkout. Fuller: `promo_codes` validated in `request_booking` with launch "FIRST10". Cheap launch-acquisition lever. |
| **Account credit / wallet ledger (enabler)** | medium | One `account_credits` ledger applied as the first discount line in `request_booking`/checkout. Shared primitive behind referrals, gift cards, goodwill, win-back, refunds. Build once. |
| **Referral credits / give-get program** | medium | Per-customer code; both sides get CAD credit on the referee's first paid job. Cheapest CAC in a tight-knit town. Deps: wallet. |

### Matching engine & supply
| Item | Effort | Grounding / why |
|------|--------|-----------------|
| **Ranked tiered offer dispatch (replace pure broadcast)** | large | Score eligible cleaners (proximity + avg_rating + acceptance_rate + responsiveness + fairness/recency + favorites) and release offers in waves; keep `accept_offer`'s atomic first-wins. Add `dispatch_tier`/`offered_at` to `booking_offers`. The ops centerpiece; also the mechanism behind every "priority" perk. Deps: P0.2 + cleaner stats + geo. |
| **Cleaner performance/reliability stats** | medium | `cleaner_stats` maintained by triggers: offers_received/accepted, acceptance_rate, avg_response_seconds, completed, cancellations, no_shows, avg_rating, last_assigned_at. O(1) reads for ranking, dashboards, auto-suspend, fraud. |
| **Time-aware availability schedule** | medium | `cleaner_availability` (weekday windows) + blackout dates; dispatch only rings cleaners whose schedule covers `scheduled_at`. Kills the off-hours decline wall the read-only `availability_note` already hinted at. |
| **Cleaner approximate geo (opt-in base point)** | medium | Optional `cleaner_details.approx_lat/lng` (coarse, ~1km snapped, captured at onboarding) so map pins and proximity ranking are anchored near reality — **never exposed raw, always fuzzed at query time.** Enhances P1 + ranked dispatch. |
| **`no_cleaner_found` recovery flow** | small | Instead of dead-ending: alert admin, optionally widen to adjacent towns, offer the customer "try another time / notify me / broaden area." Plugs into P0.2 + the map fallback. |
| **Get-directions deep link + tap-to-call** | trivial | Once `deposit_paid` unmasks the address, render a `maps:`/`tel:` link. Zero map library — it's a hyperlink. |
| **Decline-with-reason capture** | small | Reason enum on `decline_offer` + chip picker; feeds dispatch analytics and smarter routing. |
| **Earnings analytics & trends (inline SVG)** | medium | Weekly/monthly bars, avg $/job, hours, projected payout — rendered with Tailwind/SVG, no charting dep. Data already computed on the earnings page. |
| **Cleaner ratings dashboard** | small | Surface the cleaner's avg, star distribution, recent comments (already public via `reviews_select`/`get_cleaner_card`) — today nothing in the cleaner UI shows them. |
| **Onboarding completeness checklist** | small | Guided activation card (areas → availability → ID → payouts → photo/bio); gate dispatch eligibility on essentials. Matches the app's card/guided-workflow house style. |

### Payments, ops & trust
| Item | Effort | Grounding / why |
|------|--------|-----------------|
| **Stripe Connect Express payouts + payout ledger** | large | Onboard cleaners to Connect Express; attach `application_fee_amount` + `transfer_data.destination` to deposit/balance Checkout so the take-rate splits at source; `payouts` tab. Makes the supply-side money real. Deps: P0.6. |
| **Before/after photo proof of completion** | medium | Supabase Storage `job-photos` + gate `complete_job` on ≥1 after-photo; gallery on the booking page above "Pay balance." Closes the biggest evidence gap on both sides. |
| **Customer sign-off gate before balance + auto-confirm** | medium | "Confirm the job is done" step (tied to after-photos); balance payable only on confirm; 48h silence auto-confirms via cron; reject → re-clean/dispute. Deps: P0.2. |
| **Live ops dispatch board (`/admin/dispatch`)** | medium | Realtime view of every in-flight booking (tier, counts, deposit countdown, SLA flags) + manual force-rebroadcast / assign / extend / cancel. Realtime + admin override RLS already exist; the dashboard is static counts today. |
| **Append-only audit log** | medium | `audit_log` written by triggers + every admin server action (verification, reassign, refund, settings, dispute). Backbone for disputes, chargeback evidence, fraud, support console. Absent today. |
| **Support console (user 360 + actions)** | medium | One per-user surface (bookings, payments, messages, disputes, flags) with one-click refund/reassign/extend/note/suspend; every action audited. Packages existing piecemeal primitives. Deps: audit log. |
| **Programmatic SEO landing pages** | medium | `/cleaning/[area]` + `/[service]/[area]` via `generateStaticParams` over AREAS × services, localized copy, LocalBusiness JSON-LD (centroids known), live ratings, sitemap. Highest-ROI organic channel for a geo-bounded marketplace. |
| **Report & block users** | medium | `user_reports` + `user_blocks`; exclude blocked cleaners from a customer's future broadcasts in `request_booking`; admin review queue. No report/block primitive exists today. |
| **Cleaner SOS / safety check-in (in-progress)** | medium | SOS button writes `safety_incidents`, fires admin notification, offers 911 + booking/address context; optional end-of-job check-in escalation. Lone-worker safety. |
| **Verified phone (OTP) for both roles** | medium | OTP-verify `profiles.phone` before broadcasting/accepting. Cuts throwaway accounts; underpins SMS safety alerts. |
| **Dispute evidence attachments** | small | `dispute_evidence` + Storage upload on the dispute form; thumbnails for admins. The form already tells users to attach photos but offers no upload. |
| **In-app message safety (contact masking + report)** | medium | Server-side redact phone/email/URL in `send_booking_message`; basic abuse filter → moderation table; "Report message." Reduces off-platform leakage. |
| **Off-peak / dynamic pricing** | medium | `pricing_rules` (day/time multipliers, optional supply-based surge keyed off the active-cleaner count dispatch already queries) applied in `request_booking`; "Save 15% weekday mornings" on `/book`. |
| **Two-way reviews (cleaner rates customer)** | medium | Add `reviewer_id`/`reviewee_id` + double-blind reveal; cleaner review form on completion. Deps: P0.1 (schema fix). |
| **Appointment reminders & day-before confirmation** | small | Scheduler scans upcoming bookings → notifications/email "your clean is tomorrow, confirm you'll be home." Deps: P0.2 + P0.8. |
| **Abandoned-deposit recovery** | small | Scheduler scans `accepted`-but-unpaid bookings → reminder, then incentive, then expire/re-broadcast at `deposit_deadline`. Closest-to-converting revenue, abandoned silently today. Deps: P0.2 + P0.8. |
| **Coverage & capacity dashboard** | medium | Supply vs demand per area×time (active cleaners, open requests, fill rate, time-to-accept, `no_cleaner_found` incidents) as area cards / centroid SVG. Guides recruiting + surge. |
| **Analytics KPI dashboard (aggregate views)** | medium | Fill rate, time-to-accept, cancel/no-show rate, repeat rate, GMV/take, utilization — backed by SQL aggregate views instead of the current pull-all-rows-and-sum-in-JS. |

---

## P3 — Nice-to-have (later)

| Item | Effort | Grounding / why |
|------|--------|-----------------|
| **Booking progress timeline (stepper)** | trivial | Requested → Matched → Deposit → In progress → Done → Paid, derived from `booking.status`. Pure presentational. |
| **Home profile / cleaning preferences** | small | Beds/baths, pets, eco products, supplies, allergies attached to a saved home; auto-attached post-deposit. Personalizes every clean. |
| **Cleaner profile photo + bio** | small | Avatar (Storage) + blurb surfaced in `get_cleaner_card`; helps win acceptances + the favoriting loop. |
| **Upcoming-jobs calendar/agenda view** | medium | Week/agenda of accepted/deposit-paid jobs with conflict highlighting. Data is already calendar-ready. |
| **Annual tax/income CSV + admin CSV exports** | small | Per-year cleaner statement (gross/fee/net) + admin bookings/payments/disputes exports with GST/BC summary. Numbers already roll up. |
| **Customer loyalty rewards / clean streaks** | medium | Milestone punch-card applied as wallet credit. Deps: wallet. |
| **Gift cards** | medium | Stripe Checkout → redeemable code loads the wallet; `/gift` page. Recipients are zero-CAC new users. Deps: wallet. |
| **Lapsed-customer win-back** | small | Scheduler finds N-day-lapsed customers → "we miss you" + comeback promo + one-tap rebook. Deps: P0.8 + promo. |
| **Satisfaction guarantee / free re-clean** | medium | Linked $0 follow-up to the same cleaner before any refund; "Dust Busters Guarantee" badge. Turns refunds into fixed cleans. |
| **Property-damage guarantee page + structured claim** | small | Policy page + guided `property_damage` claim (photos + estimate) into the admin queue. Cheap trust; real underwriting is later. |
| **Trust & Safety center + support hub** | small | One page consolidating verification levels, guarantee, disputes/refunds, cancellation windows, support/emergency contact + live trust signals. Mostly static; lifts conversion. |
| **Granular address privacy (approx pin + purged access notes)** | medium | Pre-deposit approximate neighborhood pin (partly delivered by P1's fuzzing); split entry codes into a field revealed at deposit and auto-purged at close. |
| **Customer photo attachments (problem areas)** | medium | Customer uploads pre-job photos (Storage, signed URLs), visible to the cleaner only after deposit. Great for move-out/deep cleans. |
| **Web push for cleaners** | large | Service worker + VAPID so offers reach cleaners with the app closed — first-accept-wins makes an unseen offer lost income. (SMS via P0.8 covers most of this sooner.) |
| **Supply incentives (streaks / off-peak bonuses)** | medium | Completion streaks + admin-set bonus multipliers for hard-to-fill slots, applied at payout. Deps: Connect ledger + stats. |
| **Dust Busters Plus membership** | large | Stripe subscription: discounted rate, waived fee, free reschedules, dispatch head-start. Recurring revenue + stickiness. |
| **Cleaner "Pro" subscription (boosted dispatch + badge)** | medium | Monthly fee for an earlier offer window in ranked dispatch + a Pro badge. Supply-side recurring revenue; keep the boost bounded. |
| **B2B turnover partnerships (Airbnb/realtors/PMs)** | large | Org accounts, volume pricing, monthly invoicing, partner codes — anchors recurring utilization. Pairs with move-out tier. |
| **Fraud / abuse rules engine + review queue** | large | Rule-based scorer (same-person book/cancel, off-platform leakage, accept-then-decline blocking, no-show streaks, impossible geo jumps) → admin risk queue. Start rules before ML. |
| **Distance-based job radius (geocoded dispatch)** | large | Geocode addresses + cleaner base + max radius; rank by true distance instead of 3 town buckets. Heavier; meaningful only past launch scale. |

---

## Recommended "do it now" production push (in order)

1. **P0.1** Fix the reviews `reviewer_id` bug (trivial).
2. **P0.3** Schedule-conflict / double-booking guard (small).
3. **P0.4** Cleaner Online/Offline toggle (small).
4. **P0.2** Dispatch scheduler heartbeat — offer expiry + deposit-deadline enforcement + broadcast TTL (medium).
5. **P0.5** Enforced cancellation + automatic Stripe refunds (medium).
6. **P0.6** Commission-in-data + honest payout/fee copy (medium).
7. **P0.8** Transactional email on money/match events (medium).
8. **P0.7** Real ID verification — doc upload + admin review (medium).
9. **P0.9** Cleaner-side issue reporting (small).
10. **P1.1 + P1.2** The Uber-style live cleaner map + live transparency counts (medium) — see `docs/specs/uber-cleaner-map.md`.
11. **Fast follows that amplify the map and are nearly free:** Saved Homes (small), One-tap Re-book (trivial), Get-directions deep link (trivial), `no_cleaner_found` recovery (small).

This sequence makes every customer-facing promise true (refunds, verification, fees, payouts copy), hardens the dispatch loop the map sits on top of, then ships the flagship — followed by the cheap conveniences that make the map feel like a finished product.
