# Dust Busters — Foundation Implementation Plan (Plan 1 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js + Supabase project with email auth, three roles (customer / cleaner / admin), the core profile/settings tables, Row-Level Security, and an admin screen to verify cleaners.

**Architecture:** Next.js App Router app (TypeScript) deployed-ready for Vercel. Supabase provides Postgres, Auth, and RLS. Database schema and policies live in versioned SQL migration files applied via the Supabase CLI to a local Docker-based Supabase stack during development. A small typed Supabase client wrapper is shared by server and browser code. Tests use Vitest and run against the local Supabase instance.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Supabase (Postgres + Auth + RLS), Supabase CLI (local dev), Vitest + @testing-library, Tailwind CSS.

---

## Prerequisites (one-time, do before Task 1)

These are environment checks. If a tool is missing, install it, then continue.

- [ ] **P1: Verify Node.js 20+ is installed**

Run: `node --version`
Expected: `v20.x` or higher. If missing, install Node 20 LTS from https://nodejs.org.

- [ ] **P2: Verify Docker Desktop is running** (Supabase local stack needs it)

Run: `docker info`
Expected: prints server info, no error. If it errors, start Docker Desktop and re-run.

- [ ] **P3: Install the Supabase CLI**

Run: `npm install -g supabase`
Then: `supabase --version`
Expected: prints a version like `2.x`.

---

## File Structure

Files created in this plan:

```
package.json                      # deps + scripts
next.config.ts                    # Next.js config
tsconfig.json                     # TypeScript config
tailwind.config.ts                # Tailwind config
postcss.config.mjs                # PostCSS for Tailwind
vitest.config.ts                  # Vitest config
.env.local                        # local secrets (gitignored)
.env.example                      # template (committed)
src/app/layout.tsx                # root layout
src/app/page.tsx                  # temporary home page
src/app/globals.css               # Tailwind directives
src/lib/supabase/client.ts        # browser Supabase client
src/lib/supabase/server.ts        # server Supabase client (cookies)
src/lib/types.ts                  # shared TS types (Role, Profile, Settings)
src/app/login/page.tsx            # email login / signup UI
src/app/admin/cleaners/page.tsx   # admin: list + verify cleaners
src/app/admin/cleaners/actions.ts # server action: verify/activate cleaner
supabase/migrations/0001_init.sql # tables + enums
supabase/migrations/0002_rls.sql  # row-level security policies
supabase/seed.sql                 # one settings row
tests/lib/types.test.ts           # type/helper unit test
tests/db/rls.test.ts              # RLS policy integration tests
tests/db/helpers.ts               # test helpers (supabase admin/user clients)
```

---

## Task 1: Scaffold the Next.js + TypeScript project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Create the Next.js app non-interactively**

Run (from the repo root `D:\Dust Buster\Dust-Busters`):

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint --use-npm --yes
```

Expected: scaffolds files into the current directory. If it warns the directory is not empty, accept keeping existing files (our `.gitignore`, `docs/` stay).

- [ ] **Step 2: Start the dev server to verify it boots**

Run: `npm run dev`
Expected: `Ready` / `Local: http://localhost:3000`. Open the URL — the default Next.js page renders. Stop the server with Ctrl+C.

- [ ] **Step 3: Replace the home page with a placeholder**

Overwrite `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Dust Busters</h1>
      <p className="text-gray-600">Home cleaning, booked in minutes — Courtenay, BC.</p>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind app"
```

---

## Task 2: Add Vitest and a first passing test

**Files:**
- Create: `vitest.config.ts`, `src/lib/types.ts`, `tests/lib/types.test.ts`
- Modify: `package.json` (add test script + dev deps)

- [ ] **Step 1: Install test tooling**

Run: `npm install -D vitest @vitejs/plugin-react jsdom`

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true },
  resolve: { alias: { "@": resolve(__dirname, "src") } },
});
```

- [ ] **Step 3: Add the test script to `package.json`**

In the `"scripts"` object, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write the failing test**

Create `tests/lib/types.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computePrice, ROLES } from "@/lib/types";

describe("computePrice", () => {
  it("multiplies hours by the hourly rate", () => {
    expect(computePrice(20, 3)).toBe(60);
  });
  it("computes the 60% deposit and 40% balance", () => {
    expect(computePrice(20, 3, 60)).toEqual({ total: 60, deposit: 36, balance: 24 });
  });
});

describe("ROLES", () => {
  it("contains the three roles", () => {
    expect(ROLES).toEqual(["customer", "cleaner", "admin"]);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot import `computePrice` / `ROLES` from `@/lib/types`.

- [ ] **Step 6: Implement `src/lib/types.ts`**

```ts
export const ROLES = ["customer", "cleaner", "admin"] as const;
export type Role = (typeof ROLES)[number];

export interface Profile {
  id: string;
  role: Role;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface Settings {
  id: number;
  hourly_rate: number;
  deposit_percent: number;
  currency: string;
}

// Overloaded: with depositPercent returns a breakdown, otherwise the total.
export function computePrice(rate: number, hours: number): number;
export function computePrice(
  rate: number,
  hours: number,
  depositPercent: number
): { total: number; deposit: number; balance: number };
export function computePrice(rate: number, hours: number, depositPercent?: number) {
  const total = rate * hours;
  if (depositPercent === undefined) return total;
  const deposit = Math.round((total * depositPercent) / 100);
  return { total, deposit, balance: total - deposit };
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "test: add Vitest and computePrice/types helpers"
```

---

## Task 3: Initialize the local Supabase stack

**Files:**
- Create: `supabase/config.toml` (generated), `.env.example`, `.env.local`
- Modify: `.gitignore` (ensure Supabase temp + env ignored)

- [ ] **Step 1: Initialize Supabase in the repo**

Run: `supabase init`
Expected: creates a `supabase/` directory with `config.toml`. Accept defaults.

- [ ] **Step 2: Start the local stack**

Run: `supabase start`
Expected: pulls Docker images (first run is slow), then prints a table including `API URL` (http://127.0.0.1:54321), `anon key`, and `service_role key`. Copy these for the next step.

- [ ] **Step 3: Create `.env.example` (committed template)**

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key
```

- [ ] **Step 4: Create `.env.local` with the real keys from Step 2**

Paste the actual `anon key` and `service_role key` values printed by `supabase start`.

- [ ] **Step 5: Ensure env + Supabase temp files are gitignored**

Confirm `.gitignore` contains these lines (add any missing):

```
.env*.local
supabase/.temp/
supabase/.branches/
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: init local Supabase stack and env template"
```

---

## Task 4: Database schema migration (tables + enums)

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `supabase/seed.sql`

- [ ] **Step 1: Write the schema migration**

Create `supabase/migrations/0001_init.sql`:

```sql
-- Roles enum
create type user_role as enum ('customer', 'cleaner', 'admin');

-- Profiles: one row per auth user, created on signup via trigger.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'customer',
  name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);

-- Cleaner-specific details.
create table cleaner_details (
  profile_id uuid primary key references profiles (id) on delete cascade,
  areas_served text[] not null default '{}',
  id_verified boolean not null default false,
  verified_at timestamptz,
  active boolean not null default true
);

-- Single-row platform settings.
create table settings (
  id int primary key default 1,
  hourly_rate numeric not null default 20,
  deposit_percent int not null default 60,
  currency text not null default 'CAD',
  constraint settings_singleton check (id = 1)
);

-- Auto-create a profile when a new auth user signs up.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

- [ ] **Step 2: Create the seed file**

Create `supabase/seed.sql`:

```sql
-- Ensure exactly one settings row exists.
insert into settings (id, hourly_rate, deposit_percent, currency)
values (1, 20, 60, 'CAD')
on conflict (id) do nothing;
```

- [ ] **Step 3: Apply the migration + seed to the local DB**

Run: `supabase db reset`
Expected: drops, recreates, runs `0001_init.sql`, then `seed.sql`. Prints `Finished supabase db reset`.

- [ ] **Step 4: Verify the tables exist**

Run:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\dt public.*"
```

Expected: lists `profiles`, `cleaner_details`, `settings`. (If `psql` is unavailable, open Supabase Studio at http://127.0.0.1:54323 → Table Editor and confirm visually.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(db): initial schema (profiles, cleaner_details, settings)"
```

---

## Task 5: Row-Level Security policies

**Files:**
- Create: `supabase/migrations/0002_rls.sql`

- [ ] **Step 1: Write the RLS migration**

Create `supabase/migrations/0002_rls.sql`:

```sql
-- Helper: is the current user an admin?
create function is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table profiles enable row level security;
alter table cleaner_details enable row level security;
alter table settings enable row level security;

-- profiles: a user can read/update their own row; admins can read/update all.
create policy profiles_select_self on profiles
  for select using (id = auth.uid() or is_admin());
create policy profiles_update_self on profiles
  for update using (id = auth.uid() or is_admin());

-- cleaner_details: the owning cleaner can read/update their row; admins all.
create policy cleaner_select on cleaner_details
  for select using (profile_id = auth.uid() or is_admin());
create policy cleaner_insert_self on cleaner_details
  for insert with check (profile_id = auth.uid());
create policy cleaner_update on cleaner_details
  for update using (profile_id = auth.uid() or is_admin());
-- Note: id_verified is admin-only in practice; the admin server action uses the
-- service role to flip it, so cleaners cannot self-verify through the UI.

-- settings: anyone authenticated can read; only admins can change.
create policy settings_select on settings
  for select using (auth.role() = 'authenticated');
create policy settings_update on settings
  for update using (is_admin());
```

- [ ] **Step 2: Apply it**

Run: `supabase db reset`
Expected: runs both migrations + seed with no SQL errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(db): row-level security policies"
```

---

## Task 6: Supabase client wrappers

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
- Modify: `package.json` (add `@supabase/supabase-js`, `@supabase/ssr`)

- [ ] **Step 1: Install the Supabase libraries**

Run: `npm install @supabase/supabase-js @supabase/ssr`

- [ ] **Step 2: Create the browser client**

Create `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 3: Create the server client**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component; safe to ignore (middleware refreshes).
          }
        },
      },
    }
  );
}
```

- [ ] **Step 4: Type-check the project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Supabase browser and server client wrappers"
```

---

## Task 7: RLS integration tests

**Files:**
- Create: `tests/db/helpers.ts`, `tests/db/rls.test.ts`
- Modify: `package.json` (add `test:db` script)

These tests run against the local Supabase stack (must be `supabase start`ed).

- [ ] **Step 1: Create test helpers**

Create `tests/db/helpers.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service-role client bypasses RLS — used to set up + tear down fixtures.
export const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Create a confirmed auth user and return a client authenticated as them.
export async function makeUser(email: string, role: "customer" | "cleaner" | "admin") {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user!.id;
  await admin.from("profiles").update({ role }).eq("id", id);

  const userClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await userClient.auth.signInWithPassword({ email, password: "password123" });
  return { id, client: userClient };
}

export async function cleanup() {
  const { data } = await admin.auth.admin.listUsers();
  for (const u of data.users) {
    if (u.email?.endsWith("@rls-test.local")) {
      await admin.auth.admin.deleteUser(u.id);
    }
  }
}
```

- [ ] **Step 2: Write the failing RLS test**

Create `tests/db/rls.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { makeUser, cleanup, admin } from "./helpers";

describe("RLS policies", () => {
  afterAll(cleanup);

  it("a customer can read only their own profile", async () => {
    const a = await makeUser("a@rls-test.local", "customer");
    const b = await makeUser("b@rls-test.local", "customer");

    const own = await a.client.from("profiles").select("id").eq("id", a.id);
    expect(own.data).toHaveLength(1);

    const other = await a.client.from("profiles").select("id").eq("id", b.id);
    expect(other.data).toHaveLength(0); // hidden by RLS
  });

  it("an admin can read any profile", async () => {
    const adminUser = await makeUser("admin@rls-test.local", "admin");
    const c = await makeUser("c@rls-test.local", "customer");
    const res = await adminUser.client.from("profiles").select("id").eq("id", c.id);
    expect(res.data).toHaveLength(1);
  });

  it("a non-admin cannot update settings", async () => {
    const u = await makeUser("d@rls-test.local", "customer");
    await u.client.from("settings").update({ hourly_rate: 999 }).eq("id", 1);
    const check = await admin.from("settings").select("hourly_rate").eq("id", 1).single();
    expect(Number(check.data!.hourly_rate)).toBe(20); // unchanged
  });
});
```

- [ ] **Step 3: Run it (loads `.env.local` first)**

Run: `node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/db/rls.test.ts`
Expected: PASS (3 tests). If env vars are undefined, confirm `.env.local` has all three keys from Task 3.

- [ ] **Step 4: Add a convenience script**

In `package.json` `"scripts"`, add:

```json
"test:db": "node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/db"
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test(db): RLS policy integration tests"
```

---

## Task 8: Email login / signup page

**Files:**
- Create: `src/app/login/page.tsx`
- Modify: `supabase/config.toml` (disable email confirmation for local dev)

- [ ] **Step 1: Build the login/signup UI**

Create `src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">
        {mode === "login" ? "Log in" : "Create your account"}
      </h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            className="rounded border p-2"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className="rounded border p-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded border p-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          className="rounded bg-blue-600 p-2 text-white disabled:opacity-50"
          disabled={busy}
        >
          {busy ? "…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>
      <button
        className="text-sm text-blue-600 underline"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login"
          ? "Need an account? Sign up"
          : "Already have an account? Log in"}
      </button>
    </main>
  );
}
```

- [ ] **Step 2: Disable email confirmation for local dev**

In `supabase/config.toml`, under `[auth.email]`, set `enable_confirmations = false` so signup logs in immediately during development. Then run `supabase stop && supabase start` to apply.

- [ ] **Step 3: Manually verify signup**

Run: `npm run dev`, open http://localhost:3000/login, sign up with a test email. Expected: redirected to `/`. In Supabase Studio (http://127.0.0.1:54323) → Table Editor → `profiles`, confirm a new row exists with `role = customer` and your name.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: email login/signup page"
```

---

## Task 9: Admin — list and verify cleaners

**Files:**
- Create: `src/app/admin/cleaners/page.tsx`, `src/app/admin/cleaners/actions.ts`

- [ ] **Step 1: Create the verify server action**

Create `src/app/admin/cleaners/actions.ts`:

```ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Service-role client (server-only) to perform admin writes.
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function assertAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Forbidden");
}

export async function setCleanerVerified(profileId: string, verified: boolean) {
  await assertAdmin();
  const svc = serviceClient();
  await svc
    .from("cleaner_details")
    .update({
      id_verified: verified,
      verified_at: verified ? new Date().toISOString() : null,
    })
    .eq("profile_id", profileId);
  revalidatePath("/admin/cleaners");
}
```

- [ ] **Step 2: Create the admin cleaners page**

Create `src/app/admin/cleaners/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setCleanerVerified } from "./actions";

export default async function AdminCleanersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/");

  const { data: cleaners } = await supabase
    .from("profiles")
    .select("id, name, phone, cleaner_details(id_verified, active, areas_served)")
    .eq("role", "cleaner");

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Cleaners</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Areas</th>
            <th className="p-2">Verified</th>
            <th className="p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {(cleaners ?? []).map((c) => {
            const d = Array.isArray(c.cleaner_details)
              ? c.cleaner_details[0]
              : c.cleaner_details;
            const verified = d?.id_verified ?? false;
            return (
              <tr key={c.id} className="border-b">
                <td className="p-2">{c.name || "(no name)"}</td>
                <td className="p-2">{(d?.areas_served ?? []).join(", ") || "—"}</td>
                <td className="p-2">{verified ? "✓" : "—"}</td>
                <td className="p-2">
                  <form
                    action={async () => {
                      "use server";
                      await setCleanerVerified(c.id, !verified);
                    }}
                  >
                    <button className="rounded bg-green-600 px-3 py-1 text-white">
                      {verified ? "Unverify" : "Verify"}
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
```

- [ ] **Step 3: Manually verify the admin flow**

Promote a test user to admin once via Studio SQL editor:
`update profiles set role = 'admin' where id = '<your-user-id>';`
Create a second user, set their role to `cleaner` and insert a `cleaner_details` row (Studio). Then log in as the admin, open http://localhost:3000/admin/cleaners, click **Verify**.
Expected: the row flips to `✓`; in `cleaner_details`, `id_verified = true` and `verified_at` set.

- [ ] **Step 4: Confirm a non-admin is redirected**

Log in as the cleaner user, visit `/admin/cleaners`.
Expected: redirected to `/`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(admin): list and verify cleaners"
```

---

## Task 10: Full test run + plan wrap-up

- [ ] **Step 1: Run unit tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 2: Run DB tests** (Supabase running)

Run: `npm run test:db`
Expected: all pass.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: foundation milestone complete"
```

---

## Done criteria for Plan 1

- App boots; `/login` signs users up/in; a `profiles` row is auto-created with role `customer`.
- `profiles`, `cleaner_details`, `settings` exist with RLS; settings seeded to $20 / 60% / CAD.
- RLS verified by tests: users see only their own profile, admins see all, non-admins cannot edit settings.
- Admin can verify/unverify cleaners; non-admins are redirected away from `/admin`.

**Next:** Plan 2 — Booking + realtime broadcast dispatch.
