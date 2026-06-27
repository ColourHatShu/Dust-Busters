# 🛡️ Autonomous Knight — Operating Procedure

This file is the **self-contained playbook** for the autonomous builder. Any fresh
session (including a scheduled/cron firing) should read THIS file plus
`AUTONOMOUS-PLAN.md` and continue the work. Do not rely on prior chat memory.

## Mission
Take Dust Busters to **production-complete**: fix every real defect, build the
flagship Uber-style live cleaner-map matching experience, and ship the agreed
high-value improvements — autonomously, while the founder is away.

## Think like the product owner
Don't just clear tickets — own the product. Each iteration, ask "what would make
this genuinely great to use and ship?" Bias toward: a polished, modern,
graphics-rich UX; the flagship Uber-style map where customers watch available
cleaners appear and get matched live; cohesive visual design; and closing the gap
to a launchable product. When the backlog is thin, propose ambitious-but-grounded
features (see IDEAS.md), not busywork.

## 🎯 ACTIVE PRIORITY (founder-set, 2026-06-27)
Build the **Uber-style live cleaner map** to completion — spec in
`docs/specs/uber-cleaner-map.md`. Customers should see available cleaners on a map
(like seeing cars in Uber) and watch the live match happen. Work it before other
P2/P3 items until it's shipped end-to-end.

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
   lock exists and its timestamp is < 8 min old, another worker is active — exit.
   (Cadence is every 10 min, so the lock window is shorter than the interval.)
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
- If a migration is required, write the `.sql` under `supabase/migrations/` then
  APPLY it via the Supabase **pooler** using Node + `pg` (run from the
  **PowerShell** tool — the Bash sandbox can't resolve `*.supabase.co`; the host
  can). Connection: host `aws-1-ca-central-1.pooler.supabase.com`, user
  `postgres.wfazagqgbszrysnothtb`, port `5432`, `ssl:{rejectUnauthorized:false}`;
  password in `docs/HANDOFF.md`. If `pg` is missing: `npm i pg --no-save`. Run the
  SQL in a transaction, then VERIFY (query pg_trigger / information_schema), then
  record it in `supabase_migrations.schema_migrations (version,name)`. If the
  pooler says "tenant not found" on every region, the free-tier project has
  AUTO-PAUSED (7-day idle) — log it for the founder to resume; do not retry-loop.

## Continuous improvement loop (NEVER idle-stop)
The founder wants this to run as an **infinite loop** — keep thinking up new
features/improvements and shipping them. So there is no "done":

1. **Normal cycle:** implement the highest-priority unchecked `[ ]` item from
   `AUTONOMOUS-PLAN.md` (verify → commit → push → log), as above.
2. **When the backlog runs low** (fewer than ~3 unchecked, non-blocked `[ ]`
   items left), run an **ideation pass** BEFORE picking the next item:
   - Think broadly across lenses (customer value, cleaner/supply, trust & safety,
     monetization/growth, ops/matching, performance, a11y, polish). Look at the
     real code + `docs/ROADMAP.md` + `docs/AUDIT-FINDINGS.json` for gaps.
     Occasionally a deeper sweep is fine (e.g. spawn an Explore/brainstorm agent).
   - Append the new ideas to **`docs/IDEAS.md`** (the founder reads this) — each
     with: what it is, user value, effort, and a 1-line rationale. This is the
     "keep telling us new features" output. De-duplicate against IDEAS.md history
     and already-`[x]` items so you don't repeat or oscillate.
   - Promote the best 3–6 into the `AUTONOMOUS-PLAN.md` backlog (right tier), then
     continue the normal cycle.
3. **Quality bar (avoid runaway churn):** only propose/ship changes with real user
   or operator value. No bikeshedding, no endless cosmetic refactors, no
   reverting good work. If you can't justify an item's value in one sentence, drop
   it. Each shipped item must still pass the full verify gate.
4. Keep going indefinitely, one verified+committed item at a time. There is no
   final stop — but DO write a periodic **"📊 Milestone summary"** to
   `AUTONOMOUS-LOG.md` every ~8 shipped items (what shipped, what's queued,
   founder-only blockers) so the founder can skim progress.

> Cron note: the recurring job auto-expires after 7 days. If a firing notices the
> job is near expiry (or gone), it may re-arm it via CronCreate with this same
> prompt to keep the loop alive. Session-only: the loop runs only while a Claude
> session is open on this machine.
