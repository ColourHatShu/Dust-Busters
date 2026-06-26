# 🛡️ Autonomous Knight — Progress Log

Newest entries at the top. The founder reads this to see what happened while away.
Operating procedure: `AUTONOMOUS-KNIGHT.md`. Backlog: `AUTONOMOUS-PLAN.md`.

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
