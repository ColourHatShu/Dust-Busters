import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  CalendarDays,
  ClipboardList,
  Bell,
  ChevronRight,
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
