# 🛡️ Autonomous Knight — Progress Log

Newest entries at the top. The founder reads this to see what happened while away.
Operating procedure: `AUTONOMOUS-KNIGHT.md`. Backlog: `AUTONOMOUS-PLAN.md`.

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
