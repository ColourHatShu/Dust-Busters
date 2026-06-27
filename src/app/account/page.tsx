import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, addAddress, deleteAddress } from "./actions";
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
} from "lucide-react";

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

  const name = fullProfile?.name ?? profile?.name ?? "";
  const phone = fullProfile?.phone ?? "";
  const email = user.email ?? "";
  const accountSince = new Date(user.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Account</h1>
        <p className="text-sm text-slate-500 mt-1">Member since {accountSince}</p>
      </div>

      {/* Avatar / summary */}
      <div className="card flex items-center gap-4">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-dark text-xl font-bold text-white shadow-elevation-md">
          {name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{name || "No name set"}</p>
          <p className="text-sm text-slate-500">{email}</p>
          {phone && <p className="text-sm text-slate-500">{phone}</p>}
        </div>
      </div>

      {/* Edit profile form */}
      <div className="card space-y-5">
        <h2 className="font-semibold text-slate-800">Edit Profile</h2>
        <form action={updateProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
            >
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
            <label
              htmlFor="email-display"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
            >
              <Mail className="h-4 w-4 text-accent" strokeWidth={1.5} />
              Email address
            </label>
            <input
              id="email-display"
              type="email"
              value={email}
              disabled
              className="input-modern opacity-60 cursor-not-allowed"
              title="Email cannot be changed here"
            />
            <p className="text-xs text-slate-400">
              Email changes require contacting support.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="phone"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
            >
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
        <h2 className="flex items-center gap-1.5 font-semibold text-slate-800">
          <MapPin className="h-4 w-4 text-accent" strokeWidth={1.5} />
          Saved addresses
        </h2>

        {savedAddresses.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {savedAddresses.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  {a.label && (
                    <p className="text-sm font-medium text-slate-800">{a.label}</p>
                  )}
                  <p className="truncate text-sm text-slate-600">{a.full_address}</p>
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
          <p className="text-sm text-slate-400">
            No saved addresses yet. Add one to book faster next time.
          </p>
        )}

        <form action={addAddress} className="space-y-2 border-t border-slate-100 pt-4">
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

      {/* Quick links */}
      <div className="card divide-y divide-slate-100 p-0 overflow-hidden">
        <Link
          href="/bookings"
          className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-accent" strokeWidth={1.5} />
            <span className="font-medium text-slate-800">My Bookings</span>
          </div>
          <ChevronRight
            className="h-4 w-4 text-slate-400 group-hover:text-accent transition-colors"
            strokeWidth={1.5}
          />
        </Link>

        <div className="flex items-center justify-between px-4 py-3.5 opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
            <div>
              <span className="font-medium text-slate-800">Notification Preferences</span>
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                Coming soon
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-3.5 text-slate-500">
          <CalendarDays className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
          <span className="text-sm">Member since {accountSince}</span>
        </div>
      </div>
    </main>
  );
}
