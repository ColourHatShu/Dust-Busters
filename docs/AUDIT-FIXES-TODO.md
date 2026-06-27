# Audit fixes to RE-APPLY on the light base (from workflow whetlhe33)

The dark redesign was reverted per founder request; these LOGIC fixes were applied on the dark files and must be re-applied on light.

> **Status:** `rls-migrations` (0028) — ✅ APPLIED to the live DB + committed (2026-06-28).
> Remaining to re-apply on light: refund-math, admin-dispute, matching-resume,
> cleaner-ux, admin-rating, timezone, + re-add `disputed` to the status maps.

## refund-math
- files: C:/Users/HP/Desktop/Dust Busters/Dust-Busters/src/app/bookings/[id]/page.tsx, C:/Users/HP/Desktop/Dust Busters/Dust-Busters/src/app/admin/page.tsx

How refunds are recorded (verified in src/app/bookings/[id]/cancel-actions.ts lines 67-89): a cancellation refund is written TWO ways at once — (1) the original deposit payment row's status is flipped from 'paid' to 'refunded', and (2) a NEW row of type 'refund' is inserted with a NEGATIVE amount (-Math.abs(deposit.amount)) and status 'paid'. The Stripe webhook's charge.refunded branch only logs; it writes no payment row and no status change, so cancel-actions.ts is the sole writer. I did NOT change how refunds are stored.

Root cause of both bugs: any aggregate that filters status === 'paid' already excludes the reversed deposit (it's now 'refunded'), but ALSO includes the separate negative refund row — subtracting the refund a SECOND time. On the booking receipt this produced a negative 'Net paid' (e.g. -$30); on the admin dashboard it double-reduced revenue.

Fix (read/aggregation only, refund counted exactly once via the 'refunded' status flip; the negative 'refund' row stays for display but is excluded from totals):
- src/app/bookings/[id]/page.tsx (netPaid, ~line 135): changed the filter to `p.status === 'paid' && p.type !== 'refund'`. A refunded deposit now nets to $0.00 instead of negative; normal deposit+balance still sums in full. The receipt list still renders the 'Refund −$X' line (the map over paymentRows is unchanged) and the dark UI is untouched.
- src/app/admin/

## rls-migrations
- files: C:/Users/HP/Desktop/Dust Busters/Dust-Busters/supabase/migrations/0028_rls_insert_participation_and_cleaner_moderation.sql
- migrations: C:/Users/HP/Desktop/Dust Busters/Dust-Busters/supabase/migrations/0028_rls_insert_participation_and_cleaner_moderation.sql (APPLY via pooler)

Wrote one idempotent migration 0028_rls_insert_participation_and_cleaner_moderation.sql closing audit items 7 & 8. No existing files were edited (SQL only; no tsc check needed). needsMigrationApply = true.

(a) booking_messages + disputes INSERT holes: DROP POLICY IF EXISTS + CREATE re-creating booking_messages_insert and disputes_insert. They previously only checked sender_id/raised_by = auth.uid(). Now they additionally require booking PARTICIPATION: WITH CHECK ( <self-id> = auth.uid() AND ( is_admin() OR EXISTS(SELECT 1 FROM bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.cleaner_id = auth.uid())) ) ). is_admin() kept for parity with the existing SELECT policies. Legitimate app flows go through the SECURITY DEFINER RPCs send_booking_message / raise_dispute (verified in 0008_improvements.sql) which bypass RLS and already enforce participation, so only the direct-REST abuse is blocked.

(b) cleaner_details self-reactivate hole: The cleaner_update policy (0002_rls.sql) had USING but no WITH CHECK, and only id_verified was pinned (0009/0026). Since RLS WITH CHECK cannot compare to the OLD row, I pinned the admin moderation field `active` for non-admins inside the existing BEFORE INSERT/UPDATE trigger function enforce_cleaner_verification_admin_only (CREATE OR REPLACE; NEW.active := COALESCE(OLD.active, true) on UPDATE, true on INSERT), consistent with how

## admin-dispute
- files: C:/Users/HP/Desktop/Dust Busters/Dust-Busters/src/app/admin/disputes/[id]/actions.ts, C:/Users/HP/Desktop/Dust Busters/Dust-Busters/src/app/admin/disputes/[id]/page.tsx

Fixed both admin-dispute bugs; no DB migration required. Admin auth checks (assertAdmin / page-level role gate) preserved.

BUG 1 — wrong Stripe intent refunded on multi-payment bookings:
Root cause was in page.tsx: a JS-free hidden field `stripe_payment_intent_id` was pinned to `payments[0].stripe_payment_intent_id` (and amount `max` to `payments[0].amount`), so no matter which payment the admin selected in the `payment_id` dropdown, the action always refunded the first/most-recent payment's intent.
- actions.ts `issueRefund`: now ignores any hidden intent field and instead looks up the actually-selected payment by `paymentId` scoped to the booking (`.eq("id", paymentId).eq("booking_id", bookingId).neq("type","refund").single()`), throws if not found, and refunds THAT row's `stripe_payment_intent_id`. Added server-side amount validation (must be >0 and <= the chosen payment's amount). Reordered so the payment lookup precedes the Stripe call.
- page.tsx: removed the stale hidden `stripe_payment_intent_id` input and the misleading `max={payments[0].amount}` on the amount field (server validates against the selected payment now). The `payment_id` select still submits the correct row.

BUG 2 — booking stuck in 'disputed' after resolution:
open_dispute moves a `completed` booking to `disputed` (only completed bookings ever reach `disputed`; deposit_paid/in_progress are left unchang

## matching-resume
- files: C:/Users/HP/Desktop/Dust Busters/Dust-Busters/src/app/bookings/[id]/matching/MatchingMap.tsx

Fixed the frozen-map-after-"Search again" bug in MatchingMap.tsx (the only file I own; no DB/migration needed).

Root cause: the live `poll()` loop self-terminates the moment `statusRef.current` leaves the ACTIVE set (broadcasting/accepted) — e.g. when the booking flips to `no_cleaner_found`. After the customer hits "Search again", `rebroadcastBooking` sets the row back to `broadcasting`; the existing realtime `bookings` UPDATE subscription fires exactly one `refetch()` (so the status flips visually), but nothing re-arms the recurring poll. Counts/pins then froze until a manual reload.

Fix (targeted Edits, single useEffect preserved):
1. Added `let polling = false;` to the effect scope.
2. Extracted an idempotent `startPolling()` (the `polling` guard prevents a second concurrent loop from ever stacking) and call it on mount in place of the old direct `poll()` call.
3. `poll()` now sets `polling = false` when it stops (status no longer active or component unmounted).
4. `refetch()` now calls `startPolling()` whenever the freshly-fetched status is in ACTIVE — so the realtime-driven refetch after a re-broadcast re-arms the loop, and the live counts/pins resume updating automatically.

This reuses the existing realtime channel as the restart trigger (no new subscriptions, no extra timers). Privacy model (still polls via the SECURITY DEFINER `get_booking_matching` RPC because booki

## cleaner-ux
- files: C:/Users/HP/Desktop/Dust Busters/Dust-Busters/src/app/cleaner/onboard/page.tsx, C:/Users/HP/Desktop/Dust Busters/Dust-Busters/src/app/cleaner/jobs/page.tsx, C:/Users/HP/Desktop/Dust Busters/Dust-Busters/src/components/Nav.tsx

Fixed three cleaner-side gaps with minimal targeted edits; dark theme, grouping, server-action bindings, and all logic preserved. `npx tsc --noEmit` shows no errors in any owned file.

(1) Guarded /cleaner/onboard (src/app/cleaner/onboard/page.tsx): now destructures `profile` from getSessionProfile (already returned by the helper) and, after the existing `if (!user) redirect('/login')`, adds `if (profile?.role === 'cleaner') redirect('/cleaner/jobs')` and `if (profile?.role === 'admin') redirect('/admin')`. This stops a deactivated cleaner from re-running becomeCleaner to self-reactivate and stops an admin from accidentally demoting themselves to cleaner. Customers / roleless users still see the form unchanged.

(2) My-jobs visibility (src/app/cleaner/jobs/page.tsx): added 'balance_paid' and 'closed' to the bookings `.in('status', [...])` query so finished/paid jobs no longer fall off the list, keeping the per-job 'View details' link (and thus the rate-the-customer/review action on /cleaner/jobs/[id]) reachable. These land in the existing date-based 'Earlier' group automatically — grouping logic untouched. Also added matching STATUS_LABEL ('Paid in full', 'Closed') and STATUS_PILL ('pill-success', 'pill-neutral') entries so the status pill renders nicely instead of falling back to the raw enum string; labels/pills match the conventions already used in cleaner/jobs/[id]/page.tsx

## admin-rating
- files: C:/Users/HP/Desktop/Dust Busters/Dust-Busters/src/app/admin/cleaners/page.tsx

Fixed the admin cleaner roster's always-blank "Avg Rating" column. Root cause: the page queried `supabase.from("reviews").select("cleaner_id, rating")`, but the `reviews` table (migration 0006_reviews.sql) has no `cleaner_id` column — it has only `booking_id, rating, comment, created_at` and links to a cleaner via the FK `reviews.booking_id -> bookings(id).cleaner_id`. Reading the nonexistent column made the query fail/return null, so `reviewCount` stayed 0 and avgRating rendered "—" for every row. Two targeted edits in src/app/admin/cleaners/page.tsx: (1) changed the reviews query to `.select("rating, bookings(cleaner_id)")`, embedding the booking to obtain the cleaner via the existing FK relationship (same join get_cleaner_card uses for avg_rating); (2) updated the aggregation loop to resolve the cleaner id from the embedded booking (`const rb = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings; const cleanerId = rb?.cleaner_id;`) before accumulating totalRating/reviewCount. The existing avgRating computation, Star rendering, dark table styling, links, and unrelated stats (jobs done, cancel rate, accept rate) are untouched. tsc --noEmit reports no errors for the file. Server-side only; no per-row RPC needed (one embedded join query).

## timezone
- files: C:/Users/HP/Desktop/Dust Busters/Dust-Busters/src/lib/booking.ts, C:/Users/HP/Desktop/Dust Busters/Dust-Busters/tests/lib/booking.test.ts

Fixed the timezone bug where validateBooking parsed the `datetime-local` pick (a no-tz string) via `new Date(scheduledLocal)`, which uses the SERVER's local timezone — so on a UTC production deploy the stored instant drifted 7-8h and valid same-day afternoon bookings were wrongly rejected.

src/lib/booking.ts:
- Added `export const BOOKING_TIMEZONE = "America/Vancouver"` — all service areas (Courtenay/Comox/Cumberland = Comox Valley, BC) are Pacific Time, so the customer's wall-clock pick is interpreted in that zone.
- Added a pure, server-tz-independent, DST-correct converter `export function wallClockToUtcMs(local, timeZone): number | null`. It honors strings that already carry an explicit Z/offset (Date.parse), otherwise parses the wall-clock components and applies the zone's offset computed via `Intl.DateTimeFormat` (re-evaluated once to settle DST boundaries). Returns null for unparseable input.
- Added a private `zoneOffsetMs(timeZone, instantMs)` helper.
- validateBooking now uses `wallClockToUtcMs(scheduledLocal, timeZone ?? BOOKING_TIMEZONE)` for both the lead-window check and the stored `scheduledISO` (`new Date(t).toISOString()`), so validation and storage agree. Added an optional `timeZone?: string` field to the input (backward-compatible; actions.ts is unchanged and falls back to the default). The "invalid date" branch now keys off `t === null` instead of `Number.i

