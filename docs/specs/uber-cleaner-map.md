# Spec: Uber-style Live Cleaner Map ("Finding your cleaner")

> Status: ready to build · Migration: `0009_live_matching.sql` · Tier: P1 (flagship)
> Merges the UX design doc + the technical implementation plan into one buildable spec.
> Stack ground truth: Next.js 16.2.9 / React 19.2.4 (App Router, TS), `@supabase/ssr` 0.12 + `supabase-js` 2.108, Tailwind v4, lucide-react, accent `--color-accent:#059669` / `#10b981`. **No map library installed yet.**

---

## 1. What this is (and is not)

An Uber-style live map + matching screen that plays **between** the customer submitting `/book` and a cleaner accepting. It is a **presentation layer over the dispatch engine that already exists** (`request_booking` broadcasts → first `accept_offer` wins). No new matching algorithm, no new payment/RLS semantics.

**Guiding principle — the honesty contract.** This is a *scheduled-cleaning marketplace*, not a fleet of live drivers. We never fake GPS, "3 min away," or cleaners driving toward the house. The "Uber feel" comes from **motion, suspense, and live status** over **real** data: real verified cleaners who serve the area, a real count of who was notified, a real live decline/accept race, a real winner.

| On-screen element | Real? | Source |
|---|---|---|
| Map centered on the customer's town | Yes | `bookings.area` → area centroid |
| Pins = available cleaners | **Yes** | one pin per real `booking_offers` row for THIS booking |
| Pin *exact position* | **No — intentionally fuzzed** | deterministic jitter, seeded by `(cleaner_id, booking_id)` |
| "12 cleaners notified" | Yes | `count(booking_offers)` |
| "8 still deciding" (ticks down) | Yes, live | `booking_offers.state` `rung → declined` |
| Radar / pulse sweep | Theatre (decorative CSS) | represents "broadcasting," not a sensor |
| "Cleaner found" winner reveal | Yes | `bookings.status='accepted'` + `get_cleaner_card` |
| "Arrives Sat, Jun 28 · 10:00 AM" | Yes | `bookings.scheduled_at` (**not** a live ETA) |

**We explicitly refuse to fake:** moving pins, ETAs, phantom cleaners (3 available ⇒ 3 pins), "cleaner is driving" events, precise pin positions, and any countdown implying a match-time SLA (we count *up*). Every number a customer could screenshot is true.

---

## 2. User flow (no route changes)

`/book` → `submitBooking` → `request_booking` RPC → `redirect('/bookings/[id]')` is **unchanged**. The map is a full-bleed takeover **state** of the existing `/bookings/[id]` page, rendered while `status ∈ {broadcasting, accepted, no_cleaner_found}`, so the existing redirect target, RLS, and realtime keep working.

```
/bookings/[id] (server component) branches on status:

  broadcasting        → <MatchingScreen> full-bleed: radar, fuzzed pins,
                        "N notified · M deciding", elapsed timer, Cancel search
        │
        ├ accept_offer() → status='accepted' → winner reveal: winning pin locks,
        │                   others fade, confirmed-cleaner card slides up → ~1.5s
        │                   → collapse to normal detail (Pay deposit CTA, unchanged)
        │
        ├ all decline / TTL expiry → status='no_cleaner_found' → friendly fallback
        │                   (try another time / notify me / broaden area)
        │
        └ Cancel search → cancel_booking() → status='cancelled'

  accepted .. balance_paid → existing booking detail (cleaner card, deposit, chat)
```

Address stays masked until `deposit_paid` (existing `address_select` RLS) and is **never plotted on this map**.

---

## 3. Privacy model (load-bearing)

**Hard rule: a cleaner's real location is never sent to the browser.** Trivially safe today because cleaners have **no stored coordinates** — only `areas_served`. Pins are *synthesized*, not "real location + noise," so there is **no underlying truth to recover** (strictly stronger than Uber's snap-to-road jitter).

| Coordinate | Stored | To customer browser? | To cleaner browser? |
|---|---|---|---|
| Cleaner real home lat/lng | Not stored (by design) | Never | Never |
| Cleaner *display* pin (fuzzed) | Computed in the RPC per request | Yes — fuzzed only | N/A (cleaners get no map) |
| Customer town centroid (`◎`) | Derived from `bookings.area` | Yes (town-level) | Never |
| Customer exact address | `booking_addresses` (RLS-masked) | To the customer only | Cleaner only after `deposit_paid`; never on this map |

**Fuzz rules:**
- Anchored on the **area centroid** (Courtenay 49.6877,-124.9936; Comox 49.6733,-124.9022; Cumberland 49.6208,-125.0306), offset into a ~0.6–2.0 km annulus.
- Seed = hash of **`cleaner_id || booking_id`** → **stable during one search** (no teleporting) but **uncorrelated across bookings** (can't triangulate a cleaner by booking repeatedly). This is why we seed by booking, not by area.
- Computed **inside the `SECURITY DEFINER` RPC**; the raw cleaner row never leaves Postgres. The opaque per-pin `token = md5(cleaner_id || booking_id)` carries no UUID.
- **Do not** relax `booking_offers` RLS to let the customer read offers — that would leak `cleaner_id`s. The RPC is the only data path.
- The map is **customer-only**; cleaners keep their list-based `/cleaner/jobs` view.

---

## 4. Data model — `supabase/migrations/0009_live_matching.sql`

```sql
-- ============================================================
-- 0009_live_matching.sql — geo + RPC for the live cleaner map
-- ============================================================

-- 1. Area centroids: single source of truth in the DB (mirrors src/lib/geo.ts).
create table area_centroids (
  area        text primary key,            -- matches bookings.area / areas_served
  center_lat  double precision not null,
  center_lng  double precision not null,
  radius_km   double precision not null default 1.8
);
insert into area_centroids (area, center_lat, center_lng) values
  ('Courtenay',  49.6877, -124.9936),
  ('Comox',      49.6733, -124.9022),
  ('Cumberland', 49.6208, -125.0306)
on conflict (area) do nothing;

alter table area_centroids enable row level security;
create policy area_centroids_read on area_centroids
  for select using (auth.role() = 'authenticated');   -- centroids are non-sensitive

-- 2. Honest broadcast timeout + admin-tunable TTL.
alter table bookings  add column if not exists broadcast_expires_at timestamptz;
alter table settings  add column if not exists broadcast_ttl_mins int not null default 5;

-- 3. OPTIONAL (P2 enhancement, not required for v1): opt-in coarse cleaner base,
--    ~1km snapped, captured at onboarding. NEVER exposed raw — always fuzzed.
alter table cleaner_details
  add column if not exists approx_lat double precision,
  add column if not exists approx_lng double precision;

-- 4. Deterministic fuzz: stable per (cleaner, booking), inside the disc, fake.
--    Uses built-in md5 — no pgcrypto dependency. Token opacity, not crypto.
create or replace function fuzz_pin(p_cleaner uuid, p_booking uuid, p_area text)
returns table (lat double precision, lng double precision)
language plpgsql stable security definer set search_path = public as $$
declare
  c record; h bigint; ang double precision; dist_km double precision;
begin
  select center_lat, center_lng, radius_km into c
  from area_centroids where area = p_area;
  if not found then c := row(49.6877, -124.9936, 1.8); end if;   -- fallback: Courtenay

  h       := ('x' || substr(md5(p_cleaner::text || ':' || p_booking::text), 1, 16))::bit(64)::bigint;
  ang     := (((h % 3600) + 3600) % 3600) / 3600.0 * 2 * pi();           -- 0..2π
  dist_km := 0.6 + (((abs(h) / 3600) % 1000) / 1000.0) * c.radius_km;    -- 0.6..0.6+radius

  lat := c.center_lat + (dist_km / 110.574) * cos(ang);
  lng := c.center_lng + (dist_km / (111.320 * cos(radians(c.center_lat)))) * sin(ang);
  return next;
end; $$;

-- 5. THE map data contract. Customer cannot read booking_offers (RLS), so all
--    map data flows through this one authorising, fuzzing RPC.
create or replace function get_booking_matching(p_booking_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  b bookings%rowtype; v_center record;
  v_pins jsonb; v_notified int; v_deciding int; v_winner jsonb := null;
begin
  select * into b from bookings where id = p_booking_id;
  if not found then raise exception 'not found'; end if;

  -- AuthZ: only the owning customer (or admin) may view the match screen.
  if not (b.customer_id = auth.uid() or is_admin()) then
    raise exception 'forbidden';
  end if;

  select center_lat, center_lng into v_center from area_centroids where area = b.area;

  select count(*), count(*) filter (where o.state = 'rung')
    into v_notified, v_deciding
  from booking_offers o where o.booking_id = p_booking_id;

  -- Fuzzed pins: one per still-live offer. NO identity, NO real coords. Cap 14.
  select coalesce(jsonb_agg(pin), '[]'::jsonb) into v_pins
  from (
    select jsonb_build_object(
             'k',     substr(md5(o.cleaner_id::text || ':' || p_booking_id::text), 1, 8),
             'lat',   coalesce(cd.approx_lat, f.lat),   -- opt-in base wins if present
             'lng',   coalesce(cd.approx_lng, f.lng),   -- (still coarse, never raw home)
             'state', o.state
           ) as pin
    from booking_offers o
    join cleaner_details cd on cd.profile_id = o.cleaner_id
    cross join lateral fuzz_pin(o.cleaner_id, p_booking_id, b.area) f
    where o.booking_id = p_booking_id
      and o.state in ('rung','accepted')   -- declined pins drop off (real)
    order by o.created_at
    limit 14
  ) s;

  if b.status = 'accepted' and b.cleaner_id is not null then
    select jsonb_build_object(
             'name', gc.name, 'verified', gc.id_verified,
             'jobs', gc.jobs_completed, 'rating', gc.avg_rating,
             'scheduled_at', b.scheduled_at)
      into v_winner
    from get_cleaner_card(b.cleaner_id) gc;
  end if;

  return jsonb_build_object(
    'status',     b.status,
    'area',       b.area,
    'center',     jsonb_build_object('lat', v_center.center_lat, 'lng', v_center.center_lng),
    'notified',   v_notified,
    'deciding',   v_deciding,
    'expires_at', b.broadcast_expires_at,
    'pins',       v_pins,
    'winner',     v_winner
  );
end; $$;

grant execute on function get_booking_matching(uuid) to authenticated;

-- 6. One-line edit to request_booking: set the honest timeout on insert.
--    broadcast_expires_at = now() + make_interval(mins =>
--        (select broadcast_ttl_mins from settings where id = 1))
--    (Consider scaling TTL with lead time — see Open Decisions.)

-- 7. Expiry heartbeat. PREFERRED: fold into the P0 dispatch_tick scheduler.
--    Standalone pg_cron fallback (every minute):
-- select cron.schedule('expire_broadcasts', '* * * * *', $cron$
--   update bookings set status = 'no_cleaner_found'
--   where status = 'broadcasting' and broadcast_expires_at < now();
-- $cron$);
```

**RPC response shape (the entire client contract):**
```ts
type MatchingData = {
  status: "broadcasting" | "accepted" | "no_cleaner_found" | "cancelled" | string;
  area: string;
  center: { lat: number; lng: number };
  notified: number;
  deciding: number;
  expires_at: string | null;
  pins: { k: string; lat: number; lng: number; state: "rung" | "accepted" }[];
  winner: { name: string; verified: boolean; jobs: number; rating: number | null; scheduled_at: string } | null;
};
```
No `cleaner_id`, no real coordinates, no address ever crosses the wire.

---

## 5. Basemap decision (merged)

Two valid paths; we ship **both, layered**:

- **Primary (interactive): `react-leaflet@^5.0.0` + `leaflet@^1.9.4` + OSM raster tiles.** $0, no key, no billing; v5 targets React 19; smallest real-map footprint; declarative components match the codebase. Gives the "real streets" Uber feel.
- **Fallback / reduced-data (`prefers-reduced-motion`, tile failure, thin supply, offline): stylized static SVG basemap** of the three-town area with the same pin/radar overlay. Never a broken gray box; honest about being a representation; zero tile cost.

Both layers consume the **identical** `{center, pins}` contract, so swapping is a one-line layer change. Markers are **`L.divIcon`** (inline HTML+CSS) to avoid Leaflet's bundler marker-image 404 and to render the pulsing pins as pure CSS.

```bash
npm i leaflet@^1.9.4 react-leaflet@^5.0.0
npm i -D @types/leaflet@^1.9.12
```
Tiles: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (attribution required). `next.config.ts` needs no change unless you hit an ESM `Map container is already initialized` edge — then add `transpilePackages: ["react-leaflet","@react-leaflet/core"]`.

---

## 6. Components & files

| File | Action | Role |
|---|---|---|
| `supabase/migrations/0009_live_matching.sql` | **add** | §4 — centroids, TTL, fuzz, RPC, expiry |
| `src/lib/geo.ts` | **add** | `CleanerPin`/`MatchingData` types, `AREA_CENTROIDS`, `customerPin(bookingId, area)` (deterministic "you" jitter — never geocodes the address), SVG projection bounds |
| `src/app/bookings/[id]/page.tsx` | **edit** | branch: if `status ∈ {broadcasting, accepted, no_cleaner_found}` render `<MatchingScreen>` full-bleed (server-fetch initial `get_booking_matching` for instant paint); else existing detail. Mount logic replaces the always-on `<StatusLive/>` near line 133 — the two never both drive a refresh. |
| `src/app/bookings/[id]/MatchingScreen.tsx` | **add** (client) | Layout: map area (top ~60%), glass bottom sheet (status pill, "N notified · M deciding", elapsed timer counting **up**, reassurance copy, **Cancel search**), winner reveal, no-cleaner fallback. `aria-live="polite"` announces count/winner changes. |
| `src/app/bookings/[id]/MatchingMap.tsx` | **add** (client shell) | `dynamic(() => import("./LeafletMatchingMap"), { ssr:false, loading: MapSkeleton })`. The skeleton markup is identical server/client (no hydration mismatch). Leaflet never imported on the server. |
| `src/app/bookings/[id]/LeafletMatchingMap.tsx` | **add** (client) | `import "leaflet/dist/leaflet.css"`; `<MapContainer>` + OSM `<TileLayer>` + `<Circle>` (you-radius) + `<Marker>` (`divIcon`) for `◎` and each fuzzed pin. On tile error → swap to `AreaMapStatic`. |
| `src/app/bookings/[id]/AreaMapStatic.tsx` | **add** (client) | Stylized SVG basemap fallback; projects `{center, pins}` to SVG coords over the known bounding box; same radar/pin CSS. |
| `src/app/bookings/[id]/MatchingLive.tsx` | **add** (client) | Realtime + poll (see §7). Re-fetches `get_booking_matching`, lifts `MatchingData` into `MatchingScreen` state for smooth animation. |
| `src/app/globals.css` | **edit** | append `@keyframes radar`, `.radar-sweep`, `@keyframes pinpulse`, `.pin-cleaner`, `.pin-you`; wrap motion in `@media (prefers-reduced-motion: no-preference)`. |
| `src/app/admin/settings/page.tsx` | **edit** | expose `broadcast_ttl_mins` so support can tune the search window. |

Reuse: the existing confirmed-cleaner card markup from `page.tsx`; `cancel_booking` via `cancel-actions.ts`; the `StatusLive` realtime-cleanup pattern.

**CSS (append to `globals.css`):**
```css
@media (prefers-reduced-motion: no-preference) {
  @keyframes radar { 0% { transform: scale(.3); opacity:.55 } 100% { transform: scale(1); opacity:0 } }
  .radar-sweep { animation: radar 1.8s ease-out infinite; }
  @keyframes pinpulse { 0%{box-shadow:0 0 0 0 rgba(5,150,105,.5)} 70%{box-shadow:0 0 0 12px rgba(5,150,105,0)} 100%{box-shadow:0 0 0 0 rgba(5,150,105,0)} }
  .pin-cleaner { animation: pinpulse 1.8s infinite; }
}
.radar-sweep { position:absolute; inset:0; margin:auto; width:60%; aspect-ratio:1; border-radius:9999px;
  background:radial-gradient(circle, rgba(5,150,105,.35), transparent 70%); z-index:350; pointer-events:none; }
.pin-cleaner { display:grid; place-items:center; width:34px; height:34px; border-radius:9999px;
  background:#059669; color:#fff; font-size:11px; font-weight:700; border:2px solid #fff; }
.pin-you { width:20px; height:20px; border-radius:9999px; background:#0f172a; border:3px solid #fff;
  box-shadow:0 0 0 4px rgba(15,23,42,.15); }
```

---

## 7. Realtime wiring

Mirror the `StatusLive` pattern (`channel('booking-{id}')` → unique name → `removeChannel` cleanup), but instead of a blind `router.refresh()` we re-fetch the RPC and update local state so animations aren't cut off.

```ts
// MatchingLive.tsx (sketch)
const supabase = createClient();
const channel = supabase.channel(`match-${bookingId}`)
  .on("postgres_changes",
    { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
    (payload) => {
      const next = (payload.new as { status: string }).status;
      if (next === "accepted") { revealWinner(); refetchMatching(); }   // load-bearing moment
      else refetchMatching();                                           // cancelled / no_cleaner_found
    })
  .subscribe();
```

**Two channels of truth:**
1. **Winner / terminal status — push (postgres_changes on `bookings`).** Instant; `bookings` is already in `supabase_realtime`. This is the most important moment, so it is never polled.
2. **"deciding" counter — poll (v1).** The customer **cannot** subscribe to `booking_offers` (RLS `offers_select` = cleaner-only). While `status='broadcasting'`, call `get_booking_matching` every ~4s (and immediately on any `bookings` UPDATE, tab refocus, or reconnect). ~75 calls over a 5-min search, stops instantly on win. **v2 (defer):** have `accept_offer`/`decline_offer` emit `realtime.broadcast`/`pg_notify` on `booking-{id}` with new counts to drop polling.

**Cleanup & resilience:** clear interval + `removeChannel` on unmount and when status leaves `broadcasting`; one immediate refetch on focus/reconnect (handles "phone slept during the match"); guard the reveal animation behind a ref so duplicate events don't replay it. On WS error (`CHANNEL_ERROR`/`TIMED_OUT`) the poll already keeps counts + catches the winner within one interval; show a small "reconnecting…" dot, never a hard error.

---

## 8. Edge cases & failure modes

| # | Scenario | Detection | Handling |
|---|---|---|---|
| 1 | Zero eligible cleaners | `request_booking` already sets `no_cleaner_found` when 0 offers | Skip the radar; mount straight into the fallback. Never show an empty sweeping map. |
| 2 | All cleaners decline | all offers `declined`, none accepted | When `deciding` hits 0, copy softens to "Still reaching out…"; TTL expiry (#3) flips to `no_cleaner_found`. |
| 3 | Timeout / no response | `broadcast_expires_at < now()` | Scheduler (P0 `dispatch_tick`, or the pg_cron fallback) flips expired `broadcasting` → `no_cleaner_found`; the `bookings` UPDATE pushes the fallback instantly. Client also self-checks `expires_at` to flip UI before cron runs. |
| 4 | Customer cancels mid-search | "Cancel search" | `cancel_booking` (`FOR UPDATE`). If an accept committed first, surface "A cleaner just accepted — cancel from the booking instead?" rather than silently cancelling. |
| 5 | Two cleaners accept together | `accept_offer` row lock — first wins, second gets `false` | Customer sees one winner; second cleaner's client shows "Job already taken." No UI change. |
| 6 | Cleaner accepts then backs out pre-deposit | `decline_offer` re-broadcasts (`accepted → broadcasting`) | Realtime UPDATE re-mounts the matching screen: "Re-matching — your cleaner became unavailable." Already supported. |
| 7 | One customer, many concurrent searches | each booking independent | Each `/bookings/[id]` runs its own channel/poll. Cap concurrent active searches per customer (e.g., 3) in `request_booking`. |
| 8 | Mobile performance | — | `dynamic(ssr:false)` lazy-loads the map; cap pins at 14; pause radar on `visibilitychange`; CSS transforms only; honor reduced-motion; static fallback has zero tile cost. |
| 9 | Tiles fail / offline | tile `onerror` | Swap to `AreaMapStatic` (stylized SVG) with the same overlay — degrades to "stylized map," not "broken box." |
| 10 | Realtime drops / WS blocked | `CHANNEL_ERROR` / `TIMED_OUT` | Poll keeps counts fresh and catches the winner within one interval; tiny "reconnecting…" dot. |
| 11 | Slow accept (long search) | elapsed timer climbing | After ~90s, add a reassurance line + "Try a different time" affordance **without** cancelling (search stays alive). |
| 12 | Navigate away & return | re-mount | Server component reads current `status` and renders the right state; `MatchingLive` resyncs via immediate refetch. Match continues server-side regardless of the tab. |
| 13 | Empty pins array | RPC returns `[]` | Map still renders centered with radar + "0 nearby"; thin-supply copy ("3 vetted cleaners are reviewing") instead of fake pins. |

---

## 9. Honesty contract (carry into copy/QA)

Keep from Uber (all true here): a **real broadcast** ("12 cleaners notified"), a **real live race** (decline tick + winner reveal = real state transitions), **real vetted supply shown spatially** (just fuzzed), and **suspense via motion** (a real live auction is happening). Refuse to fake: live/moving pins, ETAs, phantom cleaners, "driving/typing" events, precise positions, or an SLA countdown. We show the **scheduled slot** ("Arrives Sat 10:00 AM"), which is the real commitment. Net: theatrical in *motion and pacing*, truthful in *data*.

---

## 10. Open decisions for the founder

1. **TTL** (`broadcast_ttl_mins`): default 5 min, but a job booked for next Saturday could stay open far longer. Consider scaling TTL with lead time (short TTL only when `scheduled_at` is soon).
2. **Thin supply** (1–2 cleaners notified): show the map with honest copy (recommended) vs. a simpler "reaching out to your area" card. Never pad with fake pins.
3. **Poll vs. push** for the deciding counter: ship Option A (poll); revisit if scale warrants `pg_notify`.
4. **Basemap default:** interactive Leaflet+OSM (recommended) with static SVG fallback, vs. static-first. Locks bundle size and the no-key decision.

---

## 11. Install & verify

```bash
npm i leaflet@^1.9.4 react-leaflet@^5.0.0 && npm i -D @types/leaflet@^1.9.12
# apply supabase/migrations/0009_live_matching.sql to the hosted DB
npm run typecheck && npm run build   # build must pass with ssr:false map
```

**Top risks → patterns:** `window is not defined` → reach Leaflet only via `dynamic(ssr:false)` from a `'use client'` shell, never from `page.tsx`. Hydration mismatch → identical `MapSkeleton` in `loading` and pre-mount. `Map container is already initialized` (React 19 StrictMode) → use `<MapContainer>` (don't hand-call `L.map()`); add `key={bookingId}` if a dev warning persists. Broken marker images → `L.divIcon` only. Channel leaks → unique `match-${bookingId}` + `removeChannel` cleanup. Privacy → RPC returns only `{k, lat, lng, state}` + counts + safe winner; never relax `booking_offers` RLS. Untyped `supabase.rpc` → cast through `MatchingData` in `src/lib/geo.ts`.

---

### Grounding references
- Dispatch & atomicity: `supabase/migrations/0003_booking.sql` (`request_booking`, `accept_offer`, `decline_offer`, `offers_select` cleaner-only RLS — the reason for the RPC-gated data path).
- Safe cleaner card: `0004_cleaner_card.sql` / `0006_reviews.sql` (`get_cleaner_card` → name, id_verified, jobs_completed, avg_rating).
- Realtime pattern to mirror: `src/app/bookings/[id]/StatusLive.tsx`, `src/app/cleaner/jobs/JobsLive.tsx`.
- Customer seam: `src/app/book/actions.ts` (`submitBooking` → `request_booking` → redirect) and `src/app/bookings/[id]/page.tsx` (status branching, cleaner card, deposit CTA near line 133).
- Cancel support for `broadcasting`: `0008_improvements.sql` (`cancel_booking`).
- Areas/centroids: `src/lib/areas.ts` (`AREAS`) — mirror into `area_centroids` + `src/lib/geo.ts`.
- Design tokens: `src/app/globals.css` (accent `#059669`/`#10b981`, `.card`, `.btn-primary`, `.btn-secondary`).
