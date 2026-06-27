import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  updateProfile,
  addAddress,
  deleteAddress,
  removeFavorite,
} from "./actions";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  CalendarDays,
  ClipboardList,
  Bell,
  ChevronRight,
  MapPin,
  Trash2,
  Heart,
  ShieldCheck,
  Star,
  Sparkles,
  Plus,
} from "lucide-react";

type FavCard = {
  cleanerId: string;
  name: string | null;
  id_verified: boolean | null;
  jobs_completed: number | null;
  avg_rating: number | null;
};

export default async function AccountPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");

  // Fetch phone from profiles (name already in profile)
  const supabase = await createClient();
  const { data: fullProfile } = await supabase
    .from("profiles")
    .select("name, phone")
    .eq("id", user.id)
    .single();

  const { data: addresses } = await supabase
    .from("saved_addresses")
    .select("id, label, full_address")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: true })
    .returns<{ id: string; label: string | null; full_address: string }[]>();
  const savedAddresses = addresses ?? [];

  // Favorite cleaners (with their public card).
  const { data: favRows } = await supabase
    .from("customer_favorites")
    .select("cleaner_id")
    .eq("customer_id", user.id)
    .returns<{ cleaner_id: string }[]>();
  const favorites: FavCard[] = await Promise.all(
    (favRows ?? []).map(async (f) => {
      const { data } = await supabase.rpc("get_cleaner_card", {
        p_cleaner: f.cleaner_id,
      });
      const card = (Array.isArray(data) ? data[0] : data) as
        | Omit<FavCard, "cleanerId">
        | null;
      return {
        cleanerId: f.cleaner_id,
        name: card?.name ?? null,
        id_verified: card?.id_verified ?? null,
        jobs_completed: card?.jobs_completed ?? null,
        avg_rating: card?.avg_rating ?? null,
      };
    }),
  );

  const name = fullProfile?.name ?? profile?.name ?? "";
  const phone = fullProfile?.phone ?? "";
  const email = user.email ?? "";
  const accountSince = new Date(user.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="app-shell relative min-h-screen py-10 sm:py-14">
      {/* Ambient depth glows */}
      <span
        className="section-glow absolute -top-24 -left-24 h-72 w-72"
        aria-hidden="true"
      />
      <span
        className="section-glow section-glow--sky absolute top-48 -right-24 h-80 w-80"
        aria-hidden="true"
      />

      <div className="app-container relative z-10">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Page header */}
          <header className="page-header">
            <span className="page-eyebrow">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              Your space
            </span>
            <h1 className="page-title text-gradient-on-dark">My Account</h1>
            <p className="page-subtitle">
              Manage your profile, saved places, and favourite cleaners.
            </p>
          </header>

          {/* Avatar / summary */}
          <section className="surface-card flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="relative flex-shrink-0">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-sky-500 text-2xl font-bold text-white shadow-[0_12px_34px_-10px_rgba(16,185,129,0.7)] ring-1 ring-white/15">
                {name
                  ? name.charAt(0).toUpperCase()
                  : email.charAt(0).toUpperCase()}
              </div>
              <span
                className="absolute -inset-1.5 -z-10 rounded-[1.4rem] bg-emerald-500/25 blur-xl"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="text-lg font-semibold text-slate-100">
                {name || "No name set"}
              </p>
              <p className="flex items-center justify-center gap-1.5 text-sm text-slate-400 sm:justify-start">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} />
                <span className="truncate">{email}</span>
              </p>
              {phone && (
                <p className="flex items-center justify-center gap-1.5 text-sm text-slate-400 sm:justify-start">
                  <Phone
                    className="h-3.5 w-3.5 flex-shrink-0"
                    strokeWidth={1.5}
                  />
                  <span>{phone}</span>
                </p>
              )}
              <div className="flex justify-center pt-1 sm:justify-start">
                <span className="pill pill-accent">
                  <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Member since {accountSince}
                </span>
              </div>
            </div>
          </section>

          {/* Edit profile form */}
          <section className="surface-card space-y-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20">
                <User className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <h2 className="text-base font-semibold text-slate-100">
                Edit profile
              </h2>
            </div>

            <form action={updateProfile} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-300"
                >
                  <User className="h-4 w-4 text-emerald-300" strokeWidth={1.5} />
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={name}
                  placeholder="Your full name"
                  maxLength={100}
                  className="input-dark"
                />
              </div>

              <div>
                <label
                  htmlFor="email-display"
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-300"
                >
                  <Mail className="h-4 w-4 text-emerald-300" strokeWidth={1.5} />
                  Email address
                </label>
                <input
                  id="email-display"
                  type="email"
                  value={email}
                  disabled
                  className="input-dark cursor-not-allowed opacity-60"
                  title="Email cannot be changed here"
                />
                <p className="field-hint">
                  Email changes require contacting support.
                </p>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-300"
                >
                  <Phone
                    className="h-4 w-4 text-emerald-300"
                    strokeWidth={1.5}
                  />
                  Phone number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={phone}
                  placeholder="+1 (555) 000-0000"
                  maxLength={30}
                  className="input-dark"
                />
              </div>

              <button type="submit" className="btn-base btn-glow w-full">
                Save changes
              </button>
            </form>
          </section>

          {/* Favorite cleaners */}
          {favorites.length > 0 && (
            <section className="surface-card space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20">
                  <Heart className="h-4 w-4 fill-current" strokeWidth={1.5} />
                </span>
                <h2 className="text-base font-semibold text-slate-100">
                  Favorite cleaners
                </h2>
                <span className="pill pill-neutral ml-auto">
                  {favorites.length}
                </span>
              </div>

              <ul className="divide-y divide-white/5">
                {favorites.map((f) => (
                  <li
                    key={f.cleanerId}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 text-sm font-bold text-white ring-1 ring-white/10">
                        {f.name?.charAt(0).toUpperCase() ?? "C"}
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-100">
                          <span className="truncate">{f.name ?? "Cleaner"}</span>
                          {f.id_verified && (
                            <ShieldCheck
                              className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400"
                              strokeWidth={2}
                            />
                          )}
                        </p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                          {f.avg_rating != null && (
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {f.avg_rating}
                            </span>
                          )}
                          <span>{f.jobs_completed ?? 0} jobs</span>
                        </p>
                      </div>
                    </div>
                    <form action={removeFavorite.bind(null, f.cleanerId)}>
                      <button
                        type="submit"
                        aria-label="Remove favorite"
                        className="focus-ring rounded-lg p-2 text-rose-400/80 transition hover:bg-rose-500/10 hover:text-rose-300"
                      >
                        <Heart className="h-4 w-4 fill-current" strokeWidth={1.5} />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Saved addresses */}
          <section className="surface-card space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300 ring-1 ring-sky-400/20">
                <MapPin className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <h2 className="text-base font-semibold text-slate-100">
                Saved addresses
              </h2>
            </div>

            {savedAddresses.length > 0 ? (
              <ul className="divide-y divide-white/5">
                {savedAddresses.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <MapPin
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-300/70"
                        strokeWidth={1.5}
                      />
                      <div className="min-w-0">
                        {a.label && (
                          <p className="text-sm font-medium text-slate-200">
                            {a.label}
                          </p>
                        )}
                        <p className="truncate text-sm text-slate-400">
                          {a.full_address}
                        </p>
                      </div>
                    </div>
                    <form action={deleteAddress.bind(null, a.id)}>
                      <button
                        type="submit"
                        aria-label="Delete address"
                        className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="surface-muted text-center">
                <MapPin
                  className="mx-auto mb-2 h-6 w-6 text-slate-500"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-slate-400">
                  No saved addresses yet. Add one to book faster next time.
                </p>
              </div>
            )}

            <form
              action={addAddress}
              className="space-y-2.5 border-t border-white/10 pt-5"
            >
              <input
                name="label"
                placeholder="Label (e.g. Home, Office) — optional"
                maxLength={40}
                className="input-dark"
              />
              <input
                name="full_address"
                placeholder="Street, unit, city"
                required
                maxLength={200}
                className="input-dark"
              />
              <button
                type="submit"
                className="btn-base btn-outline w-full text-sm sm:w-auto"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Add address
              </button>
            </form>
          </section>

          {/* Quick links */}
          <section className="surface-card space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Quick links
            </h2>

            <div className="space-y-1.5">
              <Link
                href="/bookings"
                className="focus-ring group flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20">
                    <ClipboardList className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="font-medium text-slate-200">
                    My Bookings
                  </span>
                </div>
                <ChevronRight
                  className="h-4 w-4 text-slate-500 transition-colors group-hover:text-teal-300"
                  strokeWidth={1.5}
                />
              </Link>

              <div className="flex cursor-not-allowed items-center justify-between gap-3 rounded-xl px-3 py-3 opacity-60">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 ring-1 ring-white/10">
                    <Bell className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="font-medium text-slate-300">
                    Notification Preferences
                  </span>
                </div>
                <span className="pill pill-neutral">Coming soon</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl px-3 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 ring-1 ring-white/10">
                  <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="text-sm text-slate-400">
                  Member since {accountSince}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
