# Dust Busters

A web-only home-cleaning booking marketplace for the **Comox Valley** (Courtenay /
Comox / Cumberland), BC. A customer books a scheduled cleaning; the request is
broadcast in real time to verified cleaners in the area; the first to accept wins;
the customer pays a 60% deposit, the cleaner does the job, and the customer pays
the 40% balance and leaves a review. Includes a live **Uber-style cleaner map**
that shows available cleaners and the match happening in real time.

## Stack
- **Next.js 16** (App Router, TypeScript, React 19) · **Tailwind v4** · lucide-react
- **Supabase** — Postgres, Auth, Realtime, Row-Level Security
- **Stripe** — deposit + balance payments (Checkout) and refunds
- **react-leaflet** + OpenStreetMap/CARTO tiles for the live map (no API key)

## Prerequisites
- Node 20+ (Next 16 / React 19)
- A Supabase project and a Stripe account

## Setup
```bash
npm install
cp .env.example .env.local   # then fill in real values (see .env.example)
```

## Run
```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the production build
npm run typecheck  # tsc --noEmit
npm test           # unit tests (tests/lib)
npm run test:db    # DB-backed tests (uses .env.local; hits the real DB)
```

## Database migrations
SQL migrations live in `supabase/migrations/` and run in numeric order. Apply them
with the Supabase CLI:
```bash
supabase db push --db-url "<your-connection-string>"
```
or paste a migration's SQL into the Supabase dashboard **SQL editor**.
> Note: Supabase's direct DB host is pooler-only; if `supabase db push` can't
> connect, use the **connection pooler** string (Project Settings → Database →
> Connection pooling) or the SQL editor.

## First admin
After signing up, promote your user in the Supabase SQL editor:
```sql
update profiles set role = 'admin' where id = '<your-user-uuid>';
```

## Booking status flow
```
broadcasting → accepted → deposit_paid → in_progress → completed → balance_paid → closed
                                                          ↘ disputed
cancelled            (from broadcasting / accepted / deposit_paid)
no_cleaner_found     (from broadcasting when nobody matches; can be re-broadcast)
```

## Deploy (Vercel)
1. Import the repo into Vercel.
2. Set all env vars from `.env.example` (use **live** Stripe keys for production)
   and set `NEXT_PUBLIC_BASE_URL` to the deployed origin.
3. In Stripe, add a webhook for `https://<your-domain>/api/stripe/webhook` and put
   its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Apply all migrations to the production database.

## Project docs
- `docs/specs/uber-cleaner-map.md` — the live cleaner-map design + privacy model.
- `docs/ROADMAP.md` — prioritized product roadmap.
- `docs/AUTONOMOUS-*.md` — autonomous build log / plan / operating procedure.
