# 🛡️ Autonomous Knight — Operating Procedure

This file is the **self-contained playbook** for the autonomous builder. Any fresh
session (including a scheduled/cron firing) should read THIS file plus
`AUTONOMOUS-PLAN.md` and continue the work. Do not rely on prior chat memory.

## Mission
Take Dust Busters to **production-complete**: fix every real defect, build the
flagship Uber-style live cleaner-map matching experience, and ship the agreed
high-value improvements — autonomously, while the founder is away.

## Environment
- Repo: `C:\Users\HP\Desktop\Dust Busters\Dust-Busters` (quote the space in Bash).
- Stack: Next.js 16 (App Router, TS) + Supabase (hosted) + Stripe. Tailwind v4.
- Work branch: **`dustbusters-autonomous`** (never commit to `main`).
- Secrets live in `.env.local` (gitignored). Supabase is hosted; migrations via
  `supabase db push` (see HANDOFF.md for the DBURL).

## The loop (one iteration)
1. `git checkout dustbusters-autonomous` and `git pull` if a remote exists.
2. Read `AUTONOMOUS-PLAN.md`. Pick the **highest-priority unchecked `[ ]` item**.
3. Acquire the lock: write `docs/.knight-lock` with the current `date`/item. If a
   lock exists and its timestamp is < 30 min old, another worker is active — exit.
4. Implement the item. Keep changes focused and idiomatic to the surrounding code.
5. **Verify gate (all must pass — never leave the build broken):**
   - `npx tsc --noEmit`
   - `npx next build`
   - `npm test` (unit) — and `npm run test:db` only when DB logic changed.
   If a gate fails: fix it. If you cannot, `git stash`/revert the item, mark it
   `[blocked]` in the plan with the reason, and move to the next item.
6. `git add -A && git commit` with a clear message + the Co-Authored-By footer.
   Push to `origin dustbusters-autonomous` if pushing is enabled.
7. Tick the item `[x]` in `AUTONOMOUS-PLAN.md`; append a dated entry to
   `AUTONOMOUS-LOG.md` (what changed, verify result, next up, any blocker).
8. Release the lock (delete `docs/.knight-lock`). Continue to the next item.

## Hard rules (safety)
- **Only modify this repo.** Do not touch unrelated files or other projects.
- **Never** add/commit real secrets. Never print full secret values.
- **Do NOT do founder-only actions**: creating Stripe live keys, Vercel deploy,
  rotating production secrets, sending real emails/SMS, deleting data, or any
  payment/transfer. When an item needs one of these, log it under
  **"⛔ Needs the founder"** in `AUTONOMOUS-LOG.md` and skip it.
- Prefer reversible, branch-isolated changes. Keep `main` untouched.
- If a migration is required, write the `.sql` file under `supabase/migrations/`
  and note in the log that it must be applied (`supabase db push`); apply it only
  if it is additive and safe.

## Stop condition
When every non-blocked item in `AUTONOMOUS-PLAN.md` is `[x]`, write a final
**"✅ Production-complete summary"** to `AUTONOMOUS-LOG.md` listing what shipped
and the remaining founder-only blockers, then stop scheduling further work.
