# Dust Busters — Code & Architecture Analysis

**Date:** 2026-06-26
**Scope:** Full repository — `src/` (47 files, ~6,300 LOC), all 8 Supabase migrations, tests, config, and `docs/HANDOFF.md`.
**Stack:** Next.js 16 (App Router, TS) · Supabase (Postgres / Auth / Realtime / RLS) · Stripe · Tailwind v4.
**Method:** Static review of every route, server action, RPC/migration, and RLS policy, cross-checked between three independent passes and verified line-by-line against source. `npm run typecheck` passes clean.

---

## 1. Executive summary

Dust Busters is a two-sided home-cleaning marketplace: a customer books a cleaning, the request is broadcast in real time to verified cleaners in the area, the first to accept wins, then the customer pays a 60% deposit and a 40% balance around the job. There are customer, cleaner, and admin roles, plus messaging, disputes, reviews, notifications, and an admin panel.

**Overall assessment: a well-architected core wrapped around an untested, unfinished feature layer. This is an advanced prototype, not production-ready.**

The original booking engine (Plans 1–4) is genuinely good. The dispatch logic lives in `SECURITY DEFINER` Postgres functions with correct row-locking, the "first to accept wins" race is provably atomic, RLS is thoughtfully designed (address is masked at the database layer until the deposit is paid), the Stripe webhook verifies signatures and is idempotent, and payment amounts are computed server-side and never trusted from the client. TypeScript is `strict` with zero `any`/`@ts-ignore`.

The "session 2" expansion (admin panel, disputes, refunds, reviews) tells a different story. It was written against a schema it doesn't match and appears never to have been run. Because Supabase query strings are untyped, `tsc` cannot catch table/column typos — so the codebase is "typecheck-clean" yet contains **at least seven runtime-crashing schema mismatches**, several on the money path (refunds, chargebacks). Ironically, `HANDOFF.md` documents the exact schema gotchas (`payments.type` not `payment_type`, etc.) that the new code then violates.

On top of that sit two security issues that must be fixed before any real traffic — a privilege-escalation hole that lets any user make themselves an admin, and a live database password committed to git — plus large product gaps (no email/SMS, no cleaner payout infrastructure, lifecycle dead-ends).

### Findings at a glance

| Severity | Count | Examples |
|---|---|---|
| 🔴 Critical | 2 | Privilege escalation to admin; DB password in git |
| 🟠 High | 7 | ~7 schema-mismatch crashes; refund integrity; no email/SMS; payouts are fiction |
| 🟡 Medium | 11 | Silent state-transition no-ops; missing validation; broken accent CSS; no rate limiting |
| 🔵 Low | 11 | Raw error leakage; dead code; no ESLint/CI; missing security headers |

---

## 2. What's done well (verified)

These are real strengths — keep them.

- **Atomic dispatch.** `accept_offer` (`supabase/migrations/0003_booking.sql:145`) takes `SELECT … FOR UPDATE` on the booking row, re-checks `status = 'broadcasting'`, and requires the caller to hold a `'rung'` offer before assigning. Concurrent accepts serialize; exactly one cleaner can win. The concurrency test (`tests/db/dispatch.test.ts`) asserts this.
- **Address masking enforced at the DB, not the UI.** The `address_select` RLS policy (`0003_booking.sql:72`) only exposes `booking_addresses` to the assigned cleaner once status is `deposit_paid` or later. A cleaner querying the table directly before paying sees nothing.
- **Stripe webhook is correct on the happy path.** Signature is verified with the raw body (`webhook/route.ts:23`), the route is excluded from the session proxy so the body isn't mangled, payment inserts are idempotent (unique `stripe_session_id` + `ignoreDuplicates`), and status transitions are guarded (`.eq("status","accepted")`).
- **Server-derived pricing.** Totals/deposits are computed inside `request_booking` from the `settings` row (`0003_booking.sql:118`), never taken from the client — no amount tampering.
- **Solid security hygiene elsewhere.** All `SECURITY DEFINER` functions set `search_path = public`; `is_admin()` is `stable`; no raw SQL/string interpolation; no `dangerouslySetInnerHTML`; no open redirects; `.env.local` is correctly gitignored and the API keys are *not* in git history.
- **Disciplined TypeScript.** `strict: true`, no `any`, no `@ts-ignore`, no unsafe casts.

---

## 3. 🔴 Critical findings

### C1 — Any logged-in user can make themselves an admin (privilege escalation)
**Where:** `supabase/migrations/0002_rls.sql:20-21`; exploited pattern at `src/app/cleaner/onboard/actions.ts:15`

```sql
create policy profiles_update_self on profiles
  for update using (id = auth.uid() or is_admin());   -- no WITH CHECK
```

The update policy has no `WITH CHECK` and no column restriction, so a user may change **any column on their own row — including `role`**. The app already updates `role` through the ordinary authenticated client:

```ts
await supabase.from("profiles").update({ role: "cleaner" }).eq("id", user.id);
```

The identical call works from a browser console with the public anon key:

```js
supabase.from('profiles').update({ role: 'admin' }).eq('id', '<my-uid>')
```

`is_admin()` then returns true, unlocking every admin RLS path: read all profiles/bookings/addresses/payments, change pricing, issue (attempted) refunds. This is full account takeover of the platform from any signup.

**Fix:** Add a `WITH CHECK` that forbids non-admins from changing `role`, and move the customer→cleaner transition into a `SECURITY DEFINER` RPC that can only ever set `role='cleaner'`:

```sql
create policy profiles_update_self on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy profiles_update_admin on profiles
  for update using (is_admin()) with check (is_admin());
```

### C2 — Live database password committed to git
**Where:** `docs/HANDOFF.md:19-20` (tracked; present in commit `2f78ac3`)

The handoff doc — which **is** tracked in git (confirmed via `git ls-files`) and pushed to a GitHub remote — contains the Postgres password and full connection string:

```
DB password (URL-encoded): At62%25-M_r2%40unhD
postgresql://postgres:At62%25-M_r2%40unhD@db.wfazagqgbszrysnothtb.supabase.co:5432/postgres
```

Anyone with repo access gets **direct superuser DB access, bypassing all RLS**. The doc itself notes the service_role key and password "were shared in chat history." (Good news: `.env.local` and the API keys are *not* in git history — this leak is specifically the committed password.)

**Fix:** Treat as compromised now. Rotate the Supabase DB password and `service_role` key immediately, remove the credentials from `HANDOFF.md`, and purge them from git history (`git filter-repo` / BFG) since they persist in commit `2f78ac3`.

---

## 4. 🟠 High findings

### H1 — ~7 schema-mismatch bugs that crash pages or silently fail at runtime
The new admin/dispute/review/webhook code references tables and columns that don't exist. Untyped Supabase queries mean `tsc` passes anyway. All verified against the migrations:

| # | Location | Bad reference | Reality | Effect |
|---|---|---|---|---|
| 1 | `bookings/[id]/page.tsx:104` | `reviews.reviewer_id` | column absent (`0006`) | "already reviewed?" check errors → review prompt logic broken on every completed booking |
| 2 | `admin/cleaners/page.tsx:37` | `from("offers")` | table is `booking_offers` | admin cleaners list stats break |
| 3 | `admin/cleaners/[id]/page.tsx:54,60,66` | `reviews.cleaner_id`, `reviews.created_by`, `from("offers")` | none exist | cleaner detail page errors |
| 4 | `admin/disputes/[id]/page.tsx:64,67,211` | `payments.payment_type` | column is `type` | dispute detail page errors on load |
| 5 | `admin/disputes/[id]/actions.ts:77-84` | `payment_type:"refund"`, `notes`, `updated_at` | col is `type`; enum is `deposit\|balance`; no `notes`/`updated_at` | **refund DB write always throws** |
| 6 | `admin/disputes/[id]/actions.ts:45` | `disputes.updated_at` | column absent (`0008`) | dispute status updates never persist |
| 7 | `webhook/route.ts:161-169` | `disputes.{payment_id,stripe_dispute_id,reason,amount}` + omits NOT-NULL `raised_by/category/description` | schema mismatch | **chargebacks never recorded** |

Tellingly, `admin/bookings/[id]/page.tsx:79` has the comment *"correct column is `type` not `payment_type`"* and uses it correctly — one page was fixed, the siblings weren't. This whole class strongly implies the admin panel was never executed even once.

**Fix:** Run `supabase gen types typescript` and type the client (`createClient<Database>`). That alone turns all seven into compile errors. Then correct each query and add a migration if the richer dispute/refund model is intended.

### H2 — Refund flow has no idempotency and writes before it can fail
**Where:** `src/app/admin/disputes/[id]/actions.ts:62-85`

`issueRefund` calls `stripe.refunds.create(...)` (no idempotency key) **before** the DB insert — and that insert always throws (H1 #5). So on a real refund: money leaves Stripe, no payment row is recorded, the action errors, and a retry (double-click / action replay) issues a **second refund**. Combined with the broken `charge.refunded`/`charge.dispute.created` handlers, the platform has no reliable refund ledger.

**Fix:** Write a `pending` refund row first, pass a Stripe idempotency key (e.g. keyed on dispute+amount), then mark `paid`. Fix the column names (H1).

### H3 — Cancelling after deposit refunds nothing, despite the UI promising it
**Where:** `cancel_booking` (`0008_improvements.sql:135-168`); promise at `bookings/[id]/page.tsx:335`

`cancel_booking` permits cancellation from `deposit_paid` but only flips status to `cancelled` — no Stripe refund, no record that one is owed. The booking page tells customers *"Cancellations made more than 24 hours before… receive a full deposit refund."* That policy is implemented nowhere. Customer-trust and chargeback liability.

**Fix:** Trigger a (full/partial) Stripe refund on qualifying cancellations, or remove the promise and gate the cancellation window.

### H4 — Webhook returns HTTP 200 on handler errors, so Stripe never retries
**Where:** `src/app/api/stripe/webhook/route.ts:207-211`

```ts
} catch (err) {
  console.error("[webhook] handler error:", err);
  return NextResponse.json({ received: true, error: "handler_error" }); // 200
}
```

If the DB write that advances a paid deposit to `deposit_paid` throws transiently, Stripe is told "received" and never redelivers — **the customer is charged but the booking stays `accepted` forever**. There's also no reconciliation for the edge where the deposit is captured but the guarded status update matches zero rows (e.g. booking reverted to `broadcasting`).

**Fix:** Return 5xx for unexpected/transient errors so Stripe retries (idempotency already makes retries safe); return 200 only for events you intentionally ignore.

### H5 — No transactional email or SMS anywhere
**Where:** `supabase/config.toml` (SMTP + Twilio commented out, `enable_confirmations = false`); only in-app `notifications` rows exist.

For an on-demand dispatch model this is close to fatal: a cleaner is "rung" for a new job **only** via in-app realtime — if their tab is closed, they never learn of it. Customers get no booking confirmation, no "cleaner found," no receipts, no password reset.

**Fix:** Wire an email provider (Resend/SendGrid) + SMS/push (Twilio) into the existing `createNotification` choke point.

### H6 — Cleaner "earnings & payouts" is fiction presented as real
**Where:** `src/app/cleaner/earnings/page.tsx`

The page states a 15% platform fee and *"Payouts are processed weekly every Friday via direct deposit,"* and shows concrete net figures. There is **no Stripe Connect, no payout pipeline, and cleaner bank details are captured nowhere.** Funds collect in the platform account with no way to pay cleaners.

**Fix:** Integrate Stripe Connect (Express) for cleaner onboarding + payouts before paying any real cleaner; until then, label earnings as illustrative.

### H7 — Lifecycle dead-ends: offers never expire, deposits never time out, bookings never close
Verified dead: `deposit_deadline` (added in `0008`) is never written or read; offer state `'expired'` is never set; status `'closed'` is never assigned by any migration. Consequences:

- A cleaner accepts but the customer never pays → the cleaner's slot is blocked **forever** with no timeout or re-broadcast.
- A `broadcasting` booking nobody accepts sits open indefinitely (only the zero-match case becomes `no_cleaner_found`).
- Fully-paid bookings terminate at `balance_paid` and never reach `closed`.

The cleaner UI's "Accept within the offer window" is therefore a fiction.

**Fix:** Add a scheduled job (Supabase cron / `pg_cron`) to expire stale `rung` offers, revert `accepted` bookings past `deposit_deadline`, and close fully-paid ones. Set `deposit_deadline` in `accept_offer`.

---

## 5. 🟡 Medium findings

- **M1 — State transitions fail silently.** `start_job`/`complete_job` (`0003_booking.sql:222-234`) return `void` with a guarded `WHERE`, and callers (`cleaner/actions.ts:25-35`) ignore the result. Wrong state/cleaner → nothing happens, no error, UI just refreshes. Same pattern in several admin actions. *Fix: return `boolean`/`FOUND` and surface failure.*
- **M2 — Mid-job disputes don't hold the booking.** `open_dispute` (`0008:194-204`) accepts disputes in `deposit_paid`/`in_progress`/`completed` but only sets status `disputed` when it was `completed`. A customer can dispute mid-job and still be prompted to pay the balance. *Fix: hold/transition for all dispute-eligible states; gate `complete_job`/`payBalance` when an open dispute exists.*
- **M3 — `hours` unvalidated server-side.** Only the client enforces `min/max` (`book/page.tsx`); the RPC checks `hours > 0` only. A crafted request can book `0.01h` or `100000h`. *Fix: validate min/max in `request_booking` and `submitBooking`.*
- **M4 — `scheduled_at` not validated.** No `> now()` check (bookings in the past broadcast to cleaners); `datetime-local` is converted naively in the server's timezone. *Fix: add a future-time check and carry the client offset.*
- **M5 — No rate limiting.** `request_booking` can be looped to spam every verified cleaner; `send_booking_message` is callable directly from the browser. *Fix: per-user throttle (Redis/Upstash or `created_at` checks in the DEFINER functions).*
- **M6 — Accent colors don't render (Tailwind v4).** `--color-accent*` are defined in `:root` but **not** inside `@theme inline` (`globals.css:8-20`), so utilities like `bg-accent` / `text-accent-light` (~49 usages across 10 files) generate no color. *Fix: move the accent tokens into the `@theme` block.*
- **M7 — Dark mode is half-built.** A `prefers-color-scheme: dark` block flips card/body backgrounds, but the app uses hardcoded light utilities (`bg-white`, `text-slate-900`) everywhere → unreadable contrast on dark devices. *Fix: finish with semantic tokens or remove the dark block.*
- **M8 — In-memory aggregation won't scale and can silently truncate.** Admin dashboard/cleaners/customers and cleaner earnings pull whole tables and reduce in JS; PostgREST `max_rows = 1000` (`config.toml`) means revenue/stats silently cap. *Fix: move aggregates to SQL views/RPCs.*
- **M9 — Duplicate `MessagePanel` components.** `src/components/MessagePanel.tsx` vs `src/app/bookings/[id]/MessagePanel.tsx` diverge (500 vs 1000 char limit; direct RPC vs server action; different timestamps). HANDOFF claims a single shared one. *Fix: delete one, standardize.*
- **M10 — Homepage CTA logic is dead.** `page.tsx:7` reads `user?.role`, but `role` lives on `profile`, not `user` — so `isCustomer` is always false. A symptom of the untyped-DB gap. *Fix: read `profile.role`.*
- **M11 — No error/loading/not-found boundaries.** Zero `error.tsx`/`not-found.tsx`/`loading.tsx`. Given the H1 crashes, users hit the bare Next.js error screen. *Fix: add root boundaries + route `loading.tsx`.*

---

## 6. 🔵 Low findings

- **L1 — Raw DB errors surfaced to users.** Many actions `throw new Error(error.message)`, leaking column/constraint/policy hints; the webhook echoes the signature-failure reason. *Log server-side, return generic messages.*
- **L2 — `STATUS_LABEL`/`STATUS_COLOR` duplicated ~6×**, some omitting `disputed`; the admin dashboard counts non-existent statuses (`pending`, `confirmed`) so those cards always show 0. *Import from `lib/types.ts`.*
- **L3 — `serviceClient()` copy-pasted in 6 files; `assertAdmin()` in 4.** *Extract `lib/supabase/service.ts` + `lib/auth-admin.ts`.*
- **L4 — No ESLint, CI, Prettier, or generated Supabase types.** This is the root cause of the entire H1 class. *Add `next lint` + generated types + a CI gate running `typecheck`/`test`/`lint`. Highest-leverage process fix.*
- **L5 — No security headers** in `next.config.ts` (no HSTS, `X-Frame-Options`, CSP). *Add a `headers()` block.*
- **L6 — `charge.refunded` webhook only `console.log`s** — external/dashboard refunds reconcile nowhere.
- **L7 — `customer_favorites`** table + RLS fully built but never read/written. Dead feature.
- **L8 — Fabricated trust stats** on the landing page ("50+ cleans completed", "100% ID-verified"). Honesty/compliance risk.
- **L9 — Stripe placeholder key fallback** (`lib/stripe.ts`) lets a misconfigured prod deploy look healthy. *Throw on missing keys.*
- **L10 — Booking price preview is static** — it doesn't update when the user changes hours, despite implying a live estimate.
- **L11 — Rounding mismatch.** `computePrice` (TS) rounds deposits to whole dollars; the SQL rounds to cents. The DB is the source of truth for charges, but any UI using `computePrice` will display a different number. *Round to cents in TS.*

---

## 7. Testing & tooling

- `npm run typecheck` passes — but proves little here, because untyped Supabase queries hide the H1 bugs from the compiler.
- **Good coverage** of the hardest logic: `tests/db/dispatch.test.ts` verifies broadcast-to-all, atomic single-winner accept (concurrent), address masking + reveal, and re-broadcast; `tests/db/rls.test.ts` verifies profile isolation and admin/settings access.
- **Untested:** the entire payment/webhook path, state transitions beyond accept (`start_job`/`complete_job`/`cancel_booking`/`open_dispute`), reviews, and the whole admin panel — i.e. exactly where every High/Critical bug lives. Even a smoke test that loads each admin page would have caught H1.
- `npm test` runs only the two trivial `tests/lib` unit tests; the valuable `tests/db` suite is opt-in and not in CI. (It also can't run on Linux as locked — `package-lock.json` pins a Windows-only `rolldown` binary, which would break Linux CI too.)

---

## 8. Prioritized remediation roadmap

**Before any real traffic (security & money):**
1. C1 — close the admin self-escalation hole (RLS `WITH CHECK` + RPC for role change).
2. C2 — rotate the DB password + service_role key; scrub git history.
3. H1 — generate Supabase types and fix all ~7 schema mismatches.
4. H2/H3 — make refunds idempotent and durable; honor (or remove) the deposit-refund promise.
5. H4 — webhook returns 5xx on transient errors.

**Before launch (function & trust):**
6. H5 — email/SMS notifications.
7. H6 — Stripe Connect payouts (or clearly mark earnings illustrative).
8. H7 — scheduled job for offer expiry / deposit timeout / auto-close.
9. M1–M2 — surface failed transitions; hold disputed bookings.
10. M6/M7 — fix accent CSS; finish or drop dark mode.

**Process (prevents recurrence):**
11. L4 — ESLint + generated DB types + CI running typecheck/test/lint; add integration tests for payments, the state machine, and admin pages.
12. M3/M4/M11, M8 — input validation, future-date guards, SQL-side aggregation.

---

## 9. Bottom line

The person clearly knows the Next.js / Supabase / Stripe idioms — the dispatch engine, RLS model, and webhook idempotency are better than most early-stage marketplaces. But the codebase has not been exercised end-to-end: roughly half the admin surface and the entire refund/dispute path crash on first use, two security issues are launch-blocking, and the business can't actually run two-sided yet (no notifications, no payouts). Treat the "session 2 complete / launch-ready" status in `HANDOFF.md` with skepticism. With the Critical and High items above resolved — and a CI/typing gate to stop the schema-mismatch class from returning — this becomes a credible MVP.
