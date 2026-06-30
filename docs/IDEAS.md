# 💡 Dust Busters — Continuous Ideas Ledger

The autonomous knight appends new feature/improvement ideas here as it runs (newest
on top), then promotes the best into `AUTONOMOUS-PLAN.md` to build. This is the
founder's running "what could we add next" list. Each idea: **what · value ·
effort · why**. Already-shipped ideas live as `[x]` in the plan, not here.

Legend — effort: trivial / small / medium / large.

---

## Batch 4 — ideation (2026-06-30, backlog refresh)

1. **Deposit-deadline urgency on the booking detail** · *value:* customers see
   "pay by X or lose the slot", reducing auto-expiry losses · *trivial* · why:
   surfaces the 0029 deposit_deadline. → **SHIPPED this batch**.
2. **Admin customers/cleaners CSV export** · *value:* roster/outreach reporting ·
   *small* · why: mirrors the bookings/earnings export pattern.
3. **Deposit-deadline countdown on the cleaner job list** (so cleaners see how
   long a customer has to confirm) · *small* · why: sets expectations.

> Note: the high-value, non-founder, unattended-safe backlog is largely
> exhausted. Remaining substantial work is founder-gated (Stripe keys/deploy,
> email/SMS keys, Stripe Connect, real ID verification) or wants the founder in
> the loop (rate limiter on core RPCs). Promoted to plan: admin customers/cleaners
> CSV export.

## Batch 3 — ideation (2026-06-30, backlog refresh)

1. **Admin bookings CSV export** (respecting the current filters) · *value:* ops
   pulls a filtered booking set for accounting/reporting · *small* · why: pairs
   with the new date-range filter; mirrors the cleaner earnings export. → **SHIPPED
   this batch**.
2. **Cleaner "Get directions" link** on the job detail (Google/Apple Maps deep
   link to the service address, after the deposit reveals it) · *value:* cleaners
   navigate in one tap · *trivial* · why: address is already shown; just link it.
3. **Admin "this month vs all-time" revenue** on the dashboard · *value:* quick
   trend read · *small* · why: revenue stat exists; add a month window.
4. **Customer booking detail: deposit/balance split bar** (visual % like the
   landing pricing) · *value:* clearer money breakdown · *trivial–small*.
5. **Cleaner availability: per-date "unavailable" (time off)** beyond on/off ·
   *value:* don't ring cleaners on days they can't work · *medium*.
   → **SHIPPED 2026-06-30** (migration 0033 + "Time off" card; dispatcher skips
   blocked Pacific dates). The fuller **weekly recurring schedule** (batch 2 #6)
   is still open.
6. **Saved-address picker on /book reused for reschedule** · *value:* faster ·
   *small* (depends on reschedule landing first).

> Promoted to AUTONOMOUS-PLAN.md (P3): admin bookings CSV export (shipped this
> firing), cleaner "Get directions" link, admin month-vs-all-time revenue.

## Batch 2 — ideation (2026-06-30, backlog refresh)

1. **LocalBusiness JSON-LD** structured data on the landing · *value:* local SEO +
   rich results for a single-town business · *trivial* · why: sitemap/robots/OG
   exist but no structured data. → **SHIPPED this batch**.
2. **Cleaner earnings CSV export** · *value:* cleaners/founder do their own
   bookkeeping & taxes · *small* · why: the data is already on the earnings page.
3. **Admin bookings date-range filter** · *value:* ops can scope the list by
   week/month · *small* · why: it only filters by area + status today.
4. **Chat message report / abuse flag** · *value:* trust & safety — flag a message
   into the admin queue · *small–medium* · why: messaging has no moderation path.
5. **Day-before booking reminder** (email/SMS, now that the channel exists) ·
   *value:* fewer no-shows · *medium* · why: needs a scheduler/cron (founder note).
6. **Cleaner weekly availability schedule** (beyond the on/off toggle) · *value:*
   only ring cleaners who are genuinely free · *medium* · why: improves match
   quality + reduces wasted offers.

> Promoted to AUTONOMOUS-PLAN.md (P3): earnings CSV export, admin date-range
> filter, chat message report/flag. JSON-LD shipped this firing.

## Batch 1 — ideation (2026-06-27, backlog refresh)

1. **Favorite cleaners — phase 2: a Favorites list + book-a-favorite** · *value:* let
   customers see their saved cleaners and request one directly (priority offer) ·
   *medium* · why: phase 1 (the heart toggle) just shipped; the payoff is reusing it.
2. **Reschedule a booking** (date/time) before deposit, or re-broadcast for a new
   time after · *value:* recover bookings that would otherwise be cancelled ·
   *medium* · why: "life happens" is the #1 reason people cancel.
3. **Saved addresses** on the account, prefilled at /book · *value:* faster repeat
   booking, fewer typos · *small* · why: most customers book the same home.
4. **Cleaner schedule / "Today" view** grouping won jobs by day with the address &
   ETA · *value:* cleaners plan their day · *small* · why: the data exists; just a
   grouped view of my-jobs.
5. **In-app tip after completion** (Stripe) · *value:* cleaner take-home up, zero
   platform cost · *small–medium* · why: standard gig expectation. (Founder note:
   touches the payment path — wire carefully + test-mode first.)
6. **Two-way reviews** — cleaner rates the customer/property after a job · *value:*
   safety signal + symmetry · *small* · why: reviews table is one-directional today.

> Promoted to AUTONOMOUS-PLAN.md (P2): saved addresses, cleaner "Today" view,
> reschedule, favorites phase-2.

## Batch 0 — seed ideas (2026-06-26)

1. **Room-by-room cleaning checklist on a booking** · *value:* customer sets scope
   (kitchen, 2 baths, fridge inside…), cleaner sees exactly what's expected, fewer
   disputes · *small* · why: turns a vague "3 hrs" into a shared definition of done.
   → **SHIPPED 2026-06-30** (migration 0032 + `lib/checklist.ts`; see plan P2 ideation).
2. **Before/after photo proof** (Supabase Storage) attached to a job · *value:*
   trust + dispute evidence + marketing gallery · *medium* · why: in-home services
   live or die on proof; also feeds the "satisfaction guarantee".
3. **Reschedule (not just cancel)** a booking · *value:* keeps the booking + cleaner
   match instead of losing it to a hard cancel · *small* · why: most "cancels" are
   really "not today" — recover that revenue.
4. **In-app tip after completion** (Stripe) · *value:* cleaner take-home up, zero
   platform cost · *small* · why: standard gig expectation; lifts supply retention.
5. **Referral codes / first-clean discount** · *value:* cheap growth loop in a tight
   local market · *medium* · why: word-of-mouth is the #1 channel in a single town.
6. **PWA install + web push notifications** · *value:* "add to home screen" + push
   for cleaner-found / pay-balance / review nudges (no app store) · *medium* · why:
   the deposit→balance cash flow depends on out-of-app nudges.
7. **Demand/coverage indicator for cleaners** ("3 jobs near you this week") ·
   *value:* pulls supply toward demand · *small* · why: balances the marketplace
   without manual ops.

> Knight: when you run an ideation pass, add a new dated batch above this line,
> de-duplicated against earlier batches and shipped items.
