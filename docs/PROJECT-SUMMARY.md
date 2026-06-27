# 🧹 Dust Busters — What We've Built

A complete record of the work on **Dust Busters**, an Uber-style on-demand home‑cleaning
marketplace for the Comox Valley (Courtenay, Comox, Cumberland, BC).

- **Stack:** Next.js 16 (App Router, React 19, TypeScript) · Tailwind v4 · Supabase
  (Postgres + Auth + Realtime + Row-Level Security + SECURITY DEFINER RPCs) · Stripe Checkout · lucide-react · react-leaflet.
- **Branch:** `dustbusters-autonomous` · **Commits authored as** Utsav Kampanwala.
- **DB:** 28 migrations applied live (`0001`–`0028`). **Pages:** 25 routes. **Tests:** Vitest + a CI verify workflow.

---

## 1. The Autonomous "Knight" 🛡️

A self-continuing build loop: every ~10 minutes a scheduled firing picks the single
highest-value item, implements it, runs a **verify gate** (`tsc` + `next build` + `npm test` — all must pass),
applies any DB migration via the Supabase pooler, commits to the branch, and logs progress —
**forever, without waiting for input.**

- **Operating playbook:** `docs/AUTONOMOUS-KNIGHT.md` (mission, "think like a product owner", the loop, lock rules).
- **Backlog:** `docs/AUTONOMOUS-PLAN.md` · **Progress log:** `docs/AUTONOMOUS-LOG.md` · **Ideas ledger:** `docs/IDEAS.md`.
- A file lock (`docs/.knight-lock`) prevents overlapping firings (10-min cadence, 8-min staleness window).
- **Founder-only actions are never automated** (Stripe live keys, deploys, secret rotation, real emails/SMS, deleting data) — they're logged under "⛔ Needs the founder".

---

## 2. Flagship — Uber-style live matching map 🗺️

When a customer books, the request broadcasts to nearby cleaners and the customer watches a
**live map** as it happens — just like booking a ride.

- Dark map (CARTO/OSM tiles, no API key) with **pulsing cleaner pins** + a radar "finding your cleaner" animation, live counts, and a **realtime winner reveal** when a cleaner accepts.
- **Privacy-safe by design:** cleaner pins are *synthesized* (deterministic fuzz seeded by ids) — no real coordinates or cleaner ids are ever sent to the browser. Only a guarded `get_booking_matching` RPC exposes safe data.
- **Cancel-search**, **re-broadcast** ("Search again"), an SVG fallback if tiles fail, and a 24h search window so offers don't vanish.
- Migrations: `0016_live_matching` (area centroids, approx lat/lng, fuzz_pin, the RPC) · `0017_rebroadcast` · `0019_lazy_expiry` · `0025_rebroadcast_tolerant` · `0027_longer_broadcast_window`.

---

## 3. Features shipped

### Customer
- **Booking flow** with authoritative server-side validation (date ≥ 15 min out, hours 1–12, area whitelist, address) and a live price estimator.
- **Special instructions** on a booking ("focus on the kitchen", pets, access notes) — shown to the cleaner after the deposit (`0022`).
- **Saved addresses** with a JS-free autocomplete on `/book` (`0018`).
- **Favorite cleaners** — heart toggle, a favorites list on the account page, and **book-a-favorite** (request a saved cleaner directly) (`0021`).
- **"Book again"** prefill (hours + area; address never in the URL).
- **Payment receipt** on the booking page; **deposit → balance** Stripe flow.
- **Star-rating reviews** + **two-way reviews** (the cleaner also rates the customer) (`0020`).
- **Notifications** — mark-read-on-click, deep-link to the booking, and a **"Cleaner found! 🎉"** alert when a cleaner accepts (`0024`).
- **Cancellation** with an automatic Stripe refund inside the 24h window.

### Cleaner
- **Self-service onboarding** (pick service areas) — now guarded so existing cleaners/admins don't misuse it.
- **Jobs** grouped **Today / Upcoming / Earlier**; finished jobs stay visible so reviews remain reachable.
- **Online/offline availability toggle**; **schedule-conflict guard** (no double-booking, `0011`).
- **Offer cards** with a live expiry **countdown** and take-home pay (after commission).
- **Report a problem** (cleaner-side disputes, `0014`); **Profile** + **Earnings** pages.

### Admin
- **Dashboard** — bookings, **revenue with platform-commission vs cleaner-payout breakdown**, active cleaners, open disputes, status breakdown.
- **Cleaner roster** (verify ID / activate-suspend), **customer profiles** (with rating + cleaner reviews), **bookings** + **disputes** management, **settings** (rate, deposit %, commission %, broadcast window), and a JS-free search/filter.
- **Commission model** made real (`0015`) — configurable platform fee + cleaner payout stored per booking.

---

## 4. Security & money-integrity hardening 🔒

- **3 critical RLS holes** closed early (self-promotion to admin, cleaner self-verification, notification spoofing) — `0009`.
- **2 REST-bypassable RLS holes** closed — message/dispute INSERT now require booking participation; a suspended cleaner can't self-reactivate via the REST API — `0028`.
- **Double-booking guard** (`0011`) and **double-charge guard** (app check + Stripe idempotency key).
- **Refund accounting** fixed — a refunded booking no longer shows a negative "Net paid" or double-reduces admin revenue.
- **Dispute refunds** target the correct Stripe payment intent on multi-payment bookings, and resolving a dispute un-sticks the booking from `disputed`.
- Money-path logic (refund window, booking validation) **extracted to a pure `src/lib/booking.ts` and unit-tested**.
- Security headers, error/404 boundaries, `.env.example`, real README.

---

## 5. Bugs found & fixed (mostly via live testing) 🐞

Several were **regressions from the security migrations**, caught while walking the flows:

- **Cleaner onboarding broke** — the `0009` role trigger blocked the legitimate customer→cleaner upgrade. Narrowed it (`0023`).
- **Admin "Verify" did nothing** — the trigger reverted the service-role write (`auth.uid()` is null for service role). Allowed the trusted service role (`0026`).
- **"No jobs" after verifying** — the broadcast window was only 5 min; bumped to 24h (`0027`).
- **"Search again" crash** — re-broadcast wasn't idempotent (`0025`).
- **Booking-form crash** — validation threw to the error boundary; made the form a client component with `useActionState` + inline errors; also fixed the date picker to open on full-field click.
- **Chat hydration mismatch** — message timestamps differed server vs browser; gated behind a mount flag (both MessagePanel copies).
- **Crash-hardening sweep** — every user-facing server action (cancel, dispute, report, chat, reviews, cleaner job actions, payments) now fails gracefully instead of crashing to "Something went wrong".
- **`disputed` status** + status-map / color-map consistency across pages.

---

## 6. Multi-agent workflows used 🤖

The harness ran several large fan-out workflows (one agent per unit, plus verifiers/synthesis):

- **9-agent full-app audit** — traced every flow (UI + logic) for bugs/security/a11y/UX gaps → a prioritized fix plan (`docs/AUDIT-2026-06-28.md`).
- **7-agent audit-fix sweep** — fixed the findings in parallel (logic + the `0028` migration); the remaining items are tracked in `docs/AUDIT-FIXES-TODO.md` and re-applied one verified commit at a time.
- **Council (4 lenses)** — designed the post-accept customer experience (payment-led, cleaner-as-reassurance, chat secondary). *Pending build.*
- **47-agent futuristic dark redesign** — *built, then reverted at the founder's request (see below).*

---

## 7. The UI saga 🎨

- Earlier: the **landing + login** were redesigned into a dark, futuristic style (founder-approved) — these remain.
- A 47-agent sweep then took the **whole interior** dark too. The founder didn't like it (and it had a broken admin layout), so we **reverted to the clean light/white theme** (`21be11a`). The interior is white; the marketing pages stay dark. *(Easily switchable either way.)*

---

## 8. Database migrations (`0001`–`0028`)

| # | What |
|---|------|
| 0001–0006 | Init, RLS, bookings, cleaner card, payments, reviews |
| 0007–0008 | Payment idempotency, notifications + helper RPCs |
| 0009 | Security hardening (privilege-escalation + self-verify triggers) |
| 0011–0014 | Double-booking guard, cleaner availability, refund support, cleaner disputes |
| 0015 | Commission / payout split |
| 0016–0017 | Live matching + fuzzed pins, re-broadcast |
| 0018–0022 | Saved addresses, lazy expiry, two-way reviews, book-a-favorite, booking notes |
| 0023–0027 | Fix onboarding trigger, notify-on-accept, tolerant re-broadcast, fix admin verify, 24h window |
| 0028 | RLS insert participation + cleaner moderation lock |

---

## 9. Testing & quality

- **Vitest** unit tests for the pure money/validation logic (`src/lib/booking.ts`, `src/lib/types.ts`).
- **GitHub Actions CI** — `npm ci` → typecheck → test → build on Node 20.
- Every knight commit passes the full **verify gate** before landing.

---

## 10. ⛔ Still needs the founder (cannot be automated)

- Stripe **live keys + webhook secret**; `NEXT_PUBLIC_BASE_URL`.
- **Vercel deploy**; rotate the service-role key + DB password.
- A scheduled **dispatch cron** (proactive offer/deposit-deadline expiry — currently handled lazily on read).
- Real **ID verification** + a transactional **email/SMS** provider.
- A few audit items remaining to re-apply on light: **timezone parse**, **admin avg-rating**; and the **post-accept page** design.

---

*Living document. The blow-by-blow history is in `docs/AUTONOMOUS-LOG.md`; the backlog in `docs/AUTONOMOUS-PLAN.md`.*
