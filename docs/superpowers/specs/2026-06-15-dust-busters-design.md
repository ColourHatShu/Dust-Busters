# Dust Busters — Home Cleaning Booking Website (Design Spec)

**Date:** 2026-06-15
**Status:** Approved (brainstorming complete)

## 1. Summary

Dust Busters is a web application that connects customers with vetted home
cleaners. A customer requests a cleaning for a future date/time; the request is
broadcast in real time to all cleaners serving that area; the first cleaner to
accept wins the job. The customer pays a 60% deposit to confirm (online, cards /
Interac via Stripe) and the remaining 40% after the job is completed. We already
have cleaners recruited; the immediate goal is to ship the website and attract
customers.

**Launch market:** Courtenay, British Columbia, Canada. Currency: CAD.
Hourly rate: $20/hr.

Budget is $0 to start, so every component must have a usable free tier, and the
design must grow without a rewrite.

## 2. Goals & Non-Goals

**Goals**
- Customer can book a cleaning and pay online with a trustworthy experience.
- Cleaners receive live job requests and claim them first-come-first-served.
- Admin can verify cleaners, monitor bookings, and set pricing.
- Good SEO / shareable links to attract customers cheaply.

**Non-Goals (later phases)**
- Native mobile apps (web only for now).
- Automated GPS/radius matching (area = city/zone for now).
- Cleaner-set weekly calendars (we use real-time broadcast, not schedules).
- In-app chat, loyalty programs, multi-city operations.

## 3. Key Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Platform | Web application (website) only |
| Stack | Next.js (Vercel) + Supabase + Stripe |
| Market | Courtenay, BC, Canada; CAD currency |
| Pricing | Per-hour rate (platform-fixed) = $20/hr CAD; price = hours × rate |
| Timing | Scheduled for a future date/time |
| Assignment | Real-time broadcast; first cleaner to accept wins |
| Re-broadcast | If accepted cleaner backs out, re-ring remaining cleaners |
| Area matching | By city/zone (or postal code) the cleaner serves — no GPS |
| Payment | Online; 60% deposit + 40% on completion |
| Deposit timing | 60% charged after a cleaner accepts; 40% after completion |
| Cleaner onboarding | Self-register, then admin verifies ID before they get jobs |
| Roles | Customer, Cleaner, Admin |
| Trust | Verified-cleaner profile, price breakdown, "pay rest after satisfaction", secure-payment + cancellation/support footer shown before any charge |

## 4. Architecture

- **Frontend:** Next.js (React) on Vercel free tier. Server-rendered public
  pages for SEO and good WhatsApp/Instagram link previews.
- **Backend:** Supabase — Postgres database, Auth, Realtime (powers the
  broadcast), Row-Level Security (enforces address masking), Storage (cleaner
  photos / ID docs).
- **Payments:** Stripe (cards / Interac, CAD). Two separate captures per booking:
  deposit (60%) and balance (40%) via Stripe PaymentIntents. Requires business
  details/verification before live keys work; build against test keys first.
- **Realtime broadcast:** cleaners subscribe to a Supabase Realtime channel for
  their served area(s); new offers appear instantly. Acceptance is an atomic DB
  operation so only the first cleaner wins.

## 5. Data Model (Supabase / Postgres)

```
profiles          id, role (customer|cleaner|admin), name, phone, created_at
cleaner_details   profile_id, areas_served[], id_verified, verified_at, active
settings          hourly_rate (=20), deposit_percent (=60), currency (=CAD)  (single row)
bookings          id, customer_id, cleaner_id (null until accepted),
                  scheduled_at, hours, area, full_address (gated),
                  total_amount, deposit_amount, balance_amount, status, created_at
booking_offers    id, booking_id, cleaner_id, state (rung|accepted|declined|expired),
                  responded_at
payments          id, booking_id, type (deposit|balance), stripe_payment_intent_id,
                  amount, status, paid_at
reviews           id, booking_id, rating, comment, created_at
```

### Booking status lifecycle
`requested → broadcasting → accepted → deposit_paid → in_progress →
completed → balance_paid → closed`
Unhappy paths: `cancelled`, `no_cleaner_found`.

### Critical rules
- **Address masking:** `bookings.full_address` is readable only by the assigned
  cleaner and only after status reaches `deposit_paid`. Enforced by RLS, not just
  the UI. Until then, only `area` is exposed.
- **Atomic accept:** accepting an offer must atomically set `cleaner_id` and move
  status to `accepted` only if still unclaimed; losing cleaners see the offer
  disappear.
- **Re-broadcast:** on accepted-then-declined, mark that offer `declined`, return
  booking to `broadcasting`, and re-ring cleaners who have not declined.

## 6. Screens

**Public:** Home/Landing (offer, pricing, "Book a Cleaning" CTA), Sign up / Log in
(choose Customer or Cleaner).

**Customer:** Book a Cleaning (date/time, hours, area, address, live price →
submit); Booking Status (live: "Finding a cleaner…" → "Cleaner found! Pay 60%"
with full trust layer → assigned cleaner → "Pay 40%" after job); My Bookings
(history + reviews).

**Cleaner:** Job Requests (live ring; Accept/Decline); My Jobs (accepted jobs;
address shown after deposit; Mark Complete); My Profile (areas served,
verification status).

**Admin:** All Bookings (monitor + intervene); Cleaners (verify ID, activate /
deactivate, remove); Settings (hourly rate, deposit %).

## 7. Trust & Safety (non-negotiable)

Before any charge, the payment screen must show: verified cleaner profile (photo,
name, ⭐ rating, jobs completed, "✓ ID-verified" badge); clear price breakdown
(hours × rate, 60% now, 40% later); reassurance that the 40% is paid only after
satisfaction; secure-payment indicator (Stripe), cancellation policy, and
support contact. Cleaners self-register but must be ID-verified by admin before
they can receive jobs. Exact address never shown until deposit is paid AND
cleaner is verified.

## 8. Open Items / Risks
- Stripe business verification can take a few days — build on test keys, swap to
  live later. Confirm Interac/eligible payment methods for a sole proprietor in BC.
- Define the "backs out shortly after" window (e.g., cleaner may cancel within
  N minutes / up to X hours before the slot) — to be finalized in the plan.
- Decline/expiry timeout for offers (how long before an un-answered offer is
  considered passed) — to be finalized in the plan.
