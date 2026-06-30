import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { specialtyLabels } from "@/lib/specialties";
import { frequencyLabel } from "@/lib/recurring";
import {
  updateProfile,
  addAddress,
  deleteAddress,
  removeFavorite,
  pauseRecurring,
  resumeRecurring,
  removeRecurring,
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
  Repeat,
} from "lucide-react";

type FavCard = {
  cleanerId: string;
  name: string | null;
  id_verified: boolean | null;
  jobs_completed: number | null;
  avg_rating: number | null;
  specialties: string[];
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
      const card = (Array.isArray(data) ? data[0] : data) as Omit<
        FavCard,
        "cleanerId" | "specialties"
      > | null;
      const { data: specs } = await supabase.rpc("get_cleaner_specialties", {
        p_cleaner: f.cleaner_id,
      });
      return {
        cleanerId: f.cleaner_id,
        name: card?.name ?? null,
        id_verified: card?.id_verified ?? null,
        jobs_completed: card?.jobs_completed ?? null,
        avg_rating: card?.avg_rating ?? null,
        specialties: specialtyLabels(specs as string[] | null),
      };
    }),
  );

  // Recurring plans (active + paused), RLS scopes to the owner.
  const { data: seriesRows } = await supabase
    .from("recurring_series")
    .select("id, frequency_weeks, area, next_at, active")
    .eq("customer_id", user.id)
    .order("active", { ascending: false })
    .order("next_at", { ascending: true })
    .returns<
      {
        id: string;
        frequency_weeks: number;
        area: string;
        next_at: string;
        active: boolean;
      }[]
    >();
  const recurringPlans = seriesRows ?? [];

  const name = fullProfile?.name ?? profile?.name ?? "";
  const phone = fullProfile?.phone ?? "";
  const email = user.email ?? "";
  const accountSince = new Date(user.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="page-title">My Account</h1>
        <p className="page-subtitle">Member since {accountSince}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
      {/* Avatar / summary */}
      <div className="card flex items-center gap-4">
        <div className="avatar h-16 w-16 text-xl">
          {name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-slate-900">
            {name || "No name set"}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.5} />
            <span className="truncate">{email}</span>
          </p>
          {phone && (
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.5} />
              {phone}
            </p>
          )}
        </div>
      </div>

      {/* Edit profile form */}
      <div className="card space-y-5">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-sm icon-tile-soft">
            <User className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <h2 className="section-title">Edit profile</h2>
        </div>
        <form action={updateProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="form-label">
              <User className="h-4 w-4 text-accent" strokeWidth={1.5} />
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={name}
              placeholder="Your full name"
              maxLength={100}
              className="input-modern"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email-display" className="form-label">
              <Mail className="h-4 w-4 text-accent" strokeWidth={1.5} />
              Email address
            </label>
            <input
              id="email-display"
              type="email"
              value={email}
              disabled
              className="surface-muted w-full cursor-not-allowed px-[0.9rem] py-[0.7rem] text-[0.95rem] text-slate-500"
              title="Email cannot be changed here"
            />
            <p className="form-hint">
              Email changes require contacting support.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="form-label">
              <Phone className="h-4 w-4 text-accent" strokeWidth={1.5} />
              Phone number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={phone}
              placeholder="+1 (555) 000-0000"
              maxLength={30}
              className="input-modern"
            />
          </div>

          <button type="submit" className="w-full btn-base btn-primary">
            Save changes
          </button>
        </form>
      </div>

      {/* Saved addresses */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-sm icon-tile-soft">
            <MapPin className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <h2 className="section-title">Saved addresses</h2>
        </div>

        {savedAddresses.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {savedAddresses.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="icon-tile icon-tile-sm icon-tile-soft mt-0.5">
                    <MapPin className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0">
                    {a.label && (
                      <p className="text-sm font-medium text-slate-800">{a.label}</p>
                    )}
                    <p className="truncate text-sm text-slate-600">{a.full_address}</p>
                  </div>
                </div>
                <form action={deleteAddress.bind(null, a.id)}>
                  <button
                    type="submit"
                    aria-label="Delete address"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="surface-muted px-4 py-3 text-sm text-slate-500">
            No saved addresses yet. Add one to book faster next time.
          </p>
        )}

        <form action={addAddress} className="space-y-2 border-t border-slate-100 pt-4">
          <p className="form-label">Add an address</p>
          <input
            name="label"
            placeholder="Label (e.g. Home, Office) — optional"
            maxLength={40}
            className="input-modern"
          />
          <input
            name="full_address"
            placeholder="Street, unit, city"
            required
            maxLength={200}
            className="input-modern"
          />
          <button type="submit" className="btn-base btn-secondary text-sm">
            Add address
          </button>
        </form>
      </div>
        </div>

        <aside className="space-y-6">
      {/* Recurring plans */}
      {recurringPlans.length > 0 && (
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <span className="icon-tile icon-tile-sm icon-tile-soft">
              <Repeat className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <h2 className="section-title">Recurring plans</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {recurringPlans.map((s) => (
              <li
                key={s.id}
                className="flex items-start justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    {frequencyLabel(s.frequency_weeks)} · {s.area}
                    {!s.active && (
                      <span className="badge badge-neutral">Paused</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {s.active
                      ? `Next around ${new Date(s.next_at).toLocaleDateString()}`
                      : "Paused — no new visits until you resume"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {s.active ? (
                    <form action={pauseRecurring.bind(null, s.id)}>
                      <button className="btn-base btn-secondary px-2.5 py-1 text-xs">
                        Pause
                      </button>
                    </form>
                  ) : (
                    <form action={resumeRecurring.bind(null, s.id)}>
                      <button className="btn-base btn-secondary px-2.5 py-1 text-xs">
                        Resume
                      </button>
                    </form>
                  )}
                  <form action={removeRecurring.bind(null, s.id)}>
                    <button
                      type="submit"
                      aria-label="Remove recurring plan"
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          <p className="form-hint">
            Each visit is booked automatically and paid separately. Pause for a
            vacation and resume anytime; any visit that&apos;s already scheduled
            stays put.
          </p>
        </div>
      )}

      {/* Favorite cleaners */}
      {favorites.length > 0 && (
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <span className="icon-tile icon-tile-sm icon-tile-soft">
              <Heart className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <h2 className="section-title">Favorite cleaners</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {favorites.map((f) => (
              <li
                key={f.cleanerId}
                className="flex items-start justify-between gap-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="avatar h-10 w-10 text-sm">
                    {f.name?.charAt(0).toUpperCase() ?? "C"}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-900">
                      {f.name ?? "Cleaner"}
                      {f.id_verified && (
                        <ShieldCheck
                          className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                          strokeWidth={2}
                        />
                      )}
                    </p>
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      {f.avg_rating != null && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {f.avg_rating}
                        </span>
                      )}
                      <span>{f.jobs_completed ?? 0} jobs</span>
                    </p>
                    {f.specialties.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {f.specialties.slice(0, 3).map((l) => (
                          <span
                            key={l}
                            className="badge badge-neutral text-[0.65rem]"
                          >
                            {l}
                          </span>
                        ))}
                        {f.specialties.length > 3 && (
                          <span className="self-center text-[0.65rem] text-slate-400">
                            +{f.specialties.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Link
                    href={`/book?cleaner=${f.cleanerId}`}
                    className="btn-base btn-secondary px-2.5 py-1 text-xs"
                  >
                    Book
                  </Link>
                  <form action={removeFavorite.bind(null, f.cleanerId)}>
                    <button
                      type="submit"
                      aria-label="Remove favorite"
                      className="rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Heart className="h-4 w-4 fill-current" strokeWidth={1.5} />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick links */}
      <div className="card card-flush divide-y divide-slate-100 overflow-hidden">
        <Link
          href="/bookings"
          className="group flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span className="icon-tile icon-tile-sm icon-tile-soft">
              <ClipboardList className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <span className="font-medium text-slate-800">My Bookings</span>
          </div>
          <ChevronRight
            className="h-4 w-4 text-slate-400 transition-colors group-hover:text-accent"
            strokeWidth={1.5}
          />
        </Link>

        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="icon-tile icon-tile-sm icon-tile-neutral">
              <Bell className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <span className="font-medium text-slate-500">Notification Preferences</span>
          </div>
          <span className="badge badge-neutral">Coming soon</span>
        </div>

        <div className="flex items-center gap-3 px-5 py-4">
          <span className="icon-tile icon-tile-sm icon-tile-neutral">
            <CalendarDays className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <span className="text-sm text-slate-500">Member since {accountSince}</span>
        </div>
      </div>
        </aside>
      </div>
    </main>
  );
}
