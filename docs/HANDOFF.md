# Dust Busters — Build Handoff

Last updated: 2026-06-18 (session 2 — full feature expansion complete). Use this to continue in a fresh session.

## TL;DR for next session
Plans 1–4 were already complete. Session 2 added a full **admin panel, messaging, disputes, cancellations, notifications, earnings dashboard, cleaner profile editing, and account page** — all typecheck-clean and pushed (latest commit on `main`). The ONLY remaining work is external account setup: **(1) Stripe live keys + webhook, (2) Vercel deploy**.

## What this is
Web-only home-cleaning booking app. Stack: **Next.js 16 (App Router, TS) + Supabase (Postgres/Auth/Realtime/RLS) + Stripe**. Launch market: **Courtenay, BC, Canada; CAD $20/hr**. Model: customer books a scheduled cleaning, request broadcast in real time to all verified cleaners in the area, first to accept wins (atomic), pay 60% deposit, job done, pay 40% balance. Roles: customer, cleaner, admin. Address masked until deposit paid.

Design spec: `docs/superpowers/specs/2026-06-15-dust-busters-design.md`. Plan 1 doc: `docs/superpowers/plans/2026-06-15-foundation.md`.

## User context / working style
- On Claude **Pro** (cost not a concern). Wants **fully autonomous** build, no input until launch-ready, concise updates (only the results), use multiple agents to go faster. Only surface TRUE blockers (account creation the user must do).

## Environment / secrets
- Node 24, git installed. Docker NOT installed; Supabase CLI installed (global). Hosted Supabase used (no Docker needed).
- Secrets in `.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL=https://wfazagqgbszrysnothtb.supabase.co`, anon key, service_role key. Stripe vars NOT yet set.
- Supabase project ref: `wfazagqgbszrysnothtb`. DB password (URL-encoded): `At62%25-M_r2%40unhD`.
- Apply migrations: `cd "/d/Dust Buster/Dust-Busters" && export DBURL="postgresql://postgres:At62%25-M_r2%40unhD@db.wfazagqgbszrysnothtb.supabase.co:5432/postgres" && echo Y | supabase db push --db-url "$DBURL"`
- GitHub: `origin` = https://github.com/ColourHatShu/Dust-Busters.git. Credentials cached; `git push origin main` works.

## Gotchas
- A "Fact-Forcing Gate" hook blocks Write/Edit and some Bash; restate facts (callers, schema, user instruction) and retry.
- Vitest `fileParallelism:false` (shared remote DB). Tests use `@rls-test.local` emails, cleaned up in afterAll.
- Stripe client uses a placeholder key fallback so build does not throw without env.
- Next 16 + Tailwind v4 (no tailwind.config.ts).
- `booking_offers` uses column `state` (not `status`) with values: rung, accepted, declined, expired.
- `payments` uses column `type` (not `payment_type`) with values: deposit, balance.
- `bookings` has no `updated_at` column — do not add it to updates.
- Dummy cleaner accounts (password `Password123!`): sarah@dustbusters.ca (Courtenay/Comox), james@dustbusters.ca (Courtenay/Cumberland), priya@dustbusters.ca (Comox/Cumberland).

## Database — all migrations applied
| File | What it adds |
|---|---|
| 0001_init.sql | profiles, cleaner_details, settings, handle_new_user trigger |
| 0002_rls.sql | RLS policies + is_admin() helper |
| 0003_booking.sql | bookings, booking_offers, booking_addresses, request_booking / accept_offer / decline_offer / start_job / complete_job |
| 0004_cleaner_card.sql | get_cleaner_card() RPC |
| 0005_payments.sql | payments table + RLS |
| 0006_reviews.sql | reviews table + updated get_cleaner_card with avg_rating |
| 0007_payment_idempotency.sql | unique index on payments.stripe_session_id |
| 0008_improvements.sql | booking_messages, disputes, notifications, customer_favorites tables; cancelled_by / cancellation_reason / deposit_deadline columns on bookings; disputed enum value; cancel_booking / open_dispute / send_booking_message / create_notification functions; realtime publications for new tables |

## Full route map (all pages built)

### Public
| Route | File |
|---|---|
| `/` | `src/app/page.tsx` — hero, how it works, trust section, pricing, areas |
| `/about` | `src/app/about/page.tsx` |
| `/login` | `src/app/login/page.tsx` — signup + login |

### Customer
| Route | File |
|---|---|
| `/book` | `src/app/book/page.tsx` + `actions.ts` — booking form, calls request_booking RPC |
| `/bookings` | `src/app/bookings/page.tsx` — list with status badges |
| `/bookings/[id]` | `src/app/bookings/[id]/page.tsx` — status, cleaner card, pay buttons, cancel, messaging, dispute, review prompt |
| `/bookings/[id]/dispute` | `src/app/bookings/[id]/dispute/page.tsx` + `actions.ts` |
| `/bookings/[id]/review` | `src/app/bookings/[id]/review/page.tsx` + `actions.ts` |
| `/account` | `src/app/account/page.tsx` + `actions.ts` — edit name/phone |
| `/notifications` | `src/app/notifications/page.tsx` + `actions.ts` — inbox with mark-all-read |

### Cleaner
| Route | File |
|---|---|
| `/cleaner/onboard` | `src/app/cleaner/onboard/page.tsx` + `actions.ts` — select areas |
| `/cleaner/jobs` | `src/app/cleaner/jobs/page.tsx` + `JobsLive.tsx` — open offers + my jobs, realtime |
| `/cleaner/jobs/[id]` | `src/app/cleaner/jobs/[id]/page.tsx` — job detail + messaging |
| `/cleaner/earnings` | `src/app/cleaner/earnings/page.tsx` — earnings summary + per-job breakdown |
| `/cleaner/profile` | `src/app/cleaner/profile/page.tsx` + `actions.ts` — edit name, phone, areas |

### Admin
| Route | File |
|---|---|
| `/admin` | `src/app/admin/page.tsx` — dashboard: revenue, bookings count, active cleaners, open disputes |
| `/admin/bookings` | `src/app/admin/bookings/page.tsx` — full bookings list |
| `/admin/bookings/[id]` | `src/app/admin/bookings/[id]/page.tsx` + `actions.ts` — detail with address, offers, payments, reviews, disputes; status override, cancel, reassign cleaner |
| `/admin/cleaners` | `src/app/admin/cleaners/page.tsx` + `actions.ts` — verify/unverify + deactivate |
| `/admin/cleaners/[id]` | `src/app/admin/cleaners/[id]/page.tsx` — cleaner performance profile |
| `/admin/customers` | `src/app/admin/customers/page.tsx` — customer list |
| `/admin/customers/[id]` | `src/app/admin/customers/[id]/page.tsx` — customer profile + booking history |
| `/admin/disputes` | `src/app/admin/disputes/page.tsx` — dispute queue |
| `/admin/disputes/[id]` | `src/app/admin/disputes/[id]/page.tsx` + `actions.ts` — resolve + refund |
| `/admin/settings` | `src/app/admin/settings/page.tsx` + `actions.ts` — hourly rate, deposit % |

### API
| Route | File |
|---|---|
| `/api/stripe/webhook` | `src/app/api/stripe/webhook/route.ts` — handles checkout.session.completed + charge.dispute.created; advances booking status; sends notifications |
| `/api/notifications/mark-read` | `src/app/api/notifications/mark-read/route.ts` |
| `/auth/signout` | `src/app/auth/signout/route.ts` |

### Shared components / lib
| File | What it does |
|---|---|
| `src/components/Nav.tsx` | Role-aware nav with notification bell + unread count |
| `src/components/MessagePanel.tsx` | Realtime chat component used by customer booking page + cleaner job page |
| `src/lib/notifications.ts` | Server-side helper to insert notifications via service role |
| `src/lib/types.ts` | All TypeScript interfaces: Profile, Booking, BookingStatus, Payment, Review, Dispute, Notification, BookingMessage + STATUS_LABEL/STATUS_COLOR maps |
| `src/lib/auth.ts` | getSessionProfile() |
| `src/lib/stripe.ts` | Stripe client + baseUrl() + CURRENCY |
| `src/lib/areas.ts` | AREAS constant |

## Booking status state machine
```
broadcasting -> accepted -> deposit_paid -> in_progress -> completed -> balance_paid -> closed
                                                                  |
                                                              disputed
cancelled  (from: broadcasting / accepted / deposit_paid)
no_cleaner_found  (from: broadcasting when zero cleaners match)
```

## Status (session 2 complete)
- **Plans 1-4** DONE (previous session, commit 42ac074)
- **Session 2 additions** all typecheck-clean, committed + pushed:
  - Migration 0008 applied to hosted Supabase
  - Full admin panel (dashboard, booking detail, customers, disputes, cleaner profiles)
  - Customer: cancel flow, in-job messaging, dispute reporting, notifications, account page
  - Cleaner: earnings dashboard, profile edit, job detail with messaging
  - Shared MessagePanel component with Supabase Realtime
  - Notification bell in Nav
  - Homepage enhanced (how it works, trust section, pricing)
  - Dummy cleaners seeded (sarah / james / priya, all verified, Password123!)

## Next steps to finish (resume here)
1. **Stripe** — create account, get test keys, add to `.env.local`: `STRIPE_SECRET_KEY=sk_test_...`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`. After deploy add webhook endpoint `<url>/api/stripe/webhook` and put the signing secret in env as `STRIPE_WEBHOOK_SECRET=whsec_...`.
2. **Vercel deploy** — `vercel --prod`. Set all env vars in Vercel dashboard (Supabase URL/anon/service_role, Stripe keys, `NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app`).
3. **First admin** — in Supabase SQL editor: `UPDATE profiles SET role = 'admin' WHERE id = '<your-user-uuid>';`
4. **Smoke test** — signup customer, signup cleaner (onboard at /cleaner/onboard), admin verifies cleaner, customer books, cleaner accepts, pay deposit (Stripe test card 4242 4242 4242 4242), address reveals, cleaner starts + completes, customer pays balance, customer reviews.
5. **Before go-live** — rotate service_role key + DB password (both were shared in chat history).
