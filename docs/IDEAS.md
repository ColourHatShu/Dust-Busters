# 💡 Dust Busters — Continuous Ideas Ledger

The autonomous knight appends new feature/improvement ideas here as it runs (newest
on top), then promotes the best into `AUTONOMOUS-PLAN.md` to build. This is the
founder's running "what could we add next" list. Each idea: **what · value ·
effort · why**. Already-shipped ideas live as `[x]` in the plan, not here.

Legend — effort: trivial / small / medium / large.

---

## Batch 10 — ideation (2026-06-30, plan-backlog refresh)

> Note: the safe, non-founder code-only well is getting shallow — most remaining
> big value is founder-gated (referral/discount + tips need money plumbing,
> recurring bookings is large, before/after photos needs Storage, email/SMS needs
> keys). These are solid smaller wins:

1. **Admin bookings search by customer/cleaner name** (today: area/status/date) ·
   *value:* ops find a booking fast · *small*.
2. **Printable receipt view** `/bookings/[id]/receipt` (itemized, save-as-PDF via
   the browser) · *value:* customers expense/keep a record · *small–medium*.
3. **Bio/rating/specialties on the live-map winner reveal** · *small–medium*
   (already queued batch 7 #2).
4. **Admin roster: areas + specialties columns** on the cleaners table · *small*.

> Promoted to AUTONOMOUS-PLAN.md (P3): #1 admin booking name search, #2 printable
> receipt. #3 already queued; #4 left.

## Batch 9 — ideation (2026-06-30, plan-backlog refresh)

1. **"Book" button on each favorite + `/book?cleaner=` prefill** · *value:*
   one-tap rebook a trusted cleaner from the favorites list · *small* · why: the
   favorites list only has "remove" today; the book-a-favorite dropdown exists.
2. **Cleaner profile preview ("how customers see you")** · *value:* cleaners see
   their public card (bio + specialties + verified) and are motivated to polish it
   · *small* · code-only.
3. **Bio/rating/specialties on the live-map winner reveal** · *small–medium*
   (already queued batch 7 #2 — extend to specialties).
4. **Areas + specialties columns on the admin cleaner roster list** · *small* ops.

> Promoted to AUTONOMOUS-PLAN.md (P3): #1 book-a-favorite button, #2 cleaner
> profile preview. #3 already queued; #4 left in the ledger.

## Batch 8 — ideation (2026-06-30, plan-backlog refresh)

Now that cleaner bio (0035) + specialties (0036) exist, spread the trust info:

1. **Bio + specialties on the admin cleaner detail page** · *value:* ops can see a
   cleaner's self-presentation at a glance · *small* · code-only.
2. **Specialty chips on the customer favorites list** (account page) · *value:*
   remember why you favorited them · *small* · `get_cleaner_specialties` exists.
3. **Bio/rating/specialties on the live-map winner reveal** (the "your cleaner"
   moment) · *small–medium* · client fetch of the existing readers on reveal.
4. **Filter "book a favorite" / browse by specialty** · *medium* · uses the new
   taxonomy for matching.

> Promoted to AUTONOMOUS-PLAN.md (P3): #1 admin bio/specialties, #2 favorites
> specialty chips. #3 already queued (batch 7 #2, extend to specialties); #4 left.

## Batch 7 — ideation (2026-06-30, plan-backlog refresh)

1. **Add-to-calendar (.ics)** download on a confirmed booking (customer + cleaner)
   · *value:* fewer no-shows; the appointment lands in their calendar · *small* ·
   code-only `.ics` route handler.
2. **Cleaner bio + rating on the map winner reveal** (not just the static cleaner
   card) · *value:* the "your cleaner" moment shows the trust info · *small* ·
   why: `get_cleaner_bio` + rating already exist.
3. **Cleaner earnings "this week / month" summary** cards above the earnings list
   · *value:* gig-income tracking at a glance · *small*.
4. **Admin profile-quality column** (which cleaners have an incomplete profile) ·
   *value:* ops nudge supply to finish profiles · *small*.
5. **Customer cancel-reason quick chips** (instead of only free text) · *value:*
   cleaner analytics on why people cancel · *small*.

> Promoted to AUTONOMOUS-PLAN.md (P3): #1 add-to-calendar, #2 bio/rating on the map
> winner reveal, #3 cleaner earnings period summary. #4/#5 left in the ledger.

## Batch 6 — ideation (2026-06-30, plan-backlog refresh)

Backlog thin again after batch 5 shipped out. Fresh, de-duped ideas:

1. **Cleaner specialties / tags + years of experience** (structured, beyond the
   free-text bio) shown on the cleaner card · *value:* sharper trust signal +
   future filtering · *small–medium* · why: complements the new "About me" bio.
2. **Customer "what to expect" pre-arrival card** on the booking page once a
   cleaner is matched (secure pets, parking/access, the cleaner brings supplies,
   etc.) · *value:* fewer day-of hiccups & access no-shows · *trivial–small*.
3. **Show the customer's rating on the cleaner's offer card** before they accept
   (two-way reviews already exist) · *value:* cleaners make an informed accept ·
   *small* · why: `get_customer_rating` RPC already exists.
4. **Cleaner onboarding completeness meter** (name, phone, areas, bio, availability)
   · *value:* nudges cleaners to finish a credible profile · *small*.
5. **Recurring / weekly bookings** ("book the same clean every week") · *value:*
   predictable revenue + retention · *large* · why: scheduling + a series model.
6. **Customer in-app notification preferences** (mute types) · *value:* control ·
   *medium* · why: ties into the messaging channel once founder keys are added.

> 2026-06-30 update: #5 **cleaner weekly recurring availability** SHIPPED
> (migration 0037 + `lib/weekdays.ts`; "Days you work" picker + dispatch filter).

> Promoted to AUTONOMOUS-PLAN.md (P3): #1 specialties/tags, #2 what-to-expect card,
> #3 customer rating on the offer card, #4 onboarding completeness meter.
> #5 recurring bookings + #6 notif prefs left in the ledger (larger/founder-tied).

## Batch 5 — ideation (2026-06-30, plan-backlog refresh)

The plan's `[ ]` list ran thin (rate-limiting + founder/constrained items), so this
pass promotes safe, non-founder ideas into `AUTONOMOUS-PLAN.md` to keep the loop fed.

1. **Cleaner-side deposit-deadline visibility** on accepted (awaiting-deposit)
   jobs · *value:* the cleaner holds the slot but couldn't see when it frees ·
   *small* · why: mirrors the customer-side 0029 deadline. → **SHIPPED this firing.**
2. **Reschedule / rebroadcast respect `cleaner_time_off`** · *value:* finishes the
   0033 time-off feature so a cleaner isn't rung for a blocked date on a *new*
   date either · *small–medium* · why: closes the logged 0033 follow-up.
3. **Demand / coverage indicator for cleaners** ("N requests in your areas in the
   last 7 days; you accepted M") · *value:* pulls supply toward demand, motivates
   staying online · *small* · read-only aggregation, no schema change.
4. **Deposit/balance split bar** on the customer booking page (visual % like the
   landing pricing) · *value:* clearer money breakdown · *trivial–small*.
5. **Saved-address picker reused on the reschedule form** · *value:* faster, fewer
   typos · *small* · why: the `<datalist>` already exists for /book.
6. **Cleaner weekly recurring availability** (work days/hours) beyond time-off ·
   *value:* only ring genuinely-free cleaners · *medium* (DST-aware day/time in SQL).

> Promoted to AUTONOMOUS-PLAN.md (P3): #2 time-off on reschedule/rebroadcast, #3
> demand indicator, #4 deposit/balance split bar, #5 saved-address on reschedule.
> #1 shipped this firing; #6 (weekly schedule) left in the ledger (larger).

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
   → **INSTALL HALF SHIPPED 2026-06-30** (manifest + generated icons + theme).
   Web push still open (needs founder VAPID keys).
7. **Demand/coverage indicator for cleaners** ("3 jobs near you this week") ·
   *value:* pulls supply toward demand · *small* · why: balances the marketplace
   without manual ops.

> Knight: when you run an ideation pass, add a new dated batch above this line,
> de-duplicated against earlier batches and shipped items.
