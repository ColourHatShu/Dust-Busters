import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AREAS } from "@/lib/areas";
import { updateCleanerProfile } from "./actions";
import {
  User,
  Phone,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Save,
} from "lucide-react";

export default async function CleanerProfilePage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "cleaner") redirect("/cleaner/onboard");

  const supabase = await createClient();

  // Fetch full profile including phone
  const { data: fullProfile } = await supabase
    .from("profiles")
    .select("id, name, phone, role")
    .eq("id", user.id)
    .single();

  // Fetch cleaner_details
  const { data: details } = await supabase
    .from("cleaner_details")
    .select("areas_served, id_verified, active, availability_note")
    .eq("profile_id", user.id)
    .single();

  const areasServed: string[] = details?.areas_served ?? [];
  const isVerified = details?.id_verified ?? false;
  const isActive = details?.active ?? false;
  const availabilityNote = details?.availability_note ?? "";

  return (
    <main className="app-shell relative min-h-screen overflow-hidden py-12 sm:py-16">
      <span
        className="section-glow absolute -top-24 left-1/4 h-72 w-72"
        aria-hidden
      />
      <span
        className="section-glow section-glow--sky absolute top-32 -right-16 h-80 w-80"
        aria-hidden
      />

      <div className="app-container relative z-10 max-w-2xl">
        {/* Page header */}
        <header className="page-header">
          <span className="page-eyebrow">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            Cleaner account
          </span>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">
            Manage your cleaner profile and the service areas where you accept
            jobs.
          </p>

          {/* Quick-glance status pills */}
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={`pill ${isVerified ? "pill-success" : "pill-warning"}`}
            >
              <span className="pill-dot" />
              {isVerified ? "ID verified" : "Verification pending"}
            </span>
            <span className={`pill ${isActive ? "pill-accent" : "pill-danger"}`}>
              <span className="pill-dot" />
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </header>

        {/* Verification / active status notices */}
        <div className="space-y-3">
          {!isVerified && (
            <div className="flex items-start gap-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
                <ShieldAlert className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div className="text-sm">
                <p className="font-semibold text-amber-200">
                  ID verification pending
                </p>
                <p className="mt-1 text-slate-400">
                  Your ID verification is pending admin review. You&apos;ll start
                  receiving job offers once approved.
                </p>
              </div>
            </div>
          )}

          {isVerified && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] px-4 py-3 text-sm">
              <ShieldCheck
                className="h-5 w-5 flex-shrink-0 text-emerald-300"
                strokeWidth={1.5}
              />
              <span className="font-medium text-emerald-200">ID verified</span>
            </div>
          )}

          {!isActive && (
            <div className="flex items-start gap-4 rounded-2xl border border-red-400/25 bg-red-500/[0.06] p-4">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 text-red-300">
                <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div className="text-sm">
                <p className="font-semibold text-red-200">Account inactive</p>
                <p className="mt-1 text-slate-400">
                  Your account is currently inactive. Contact support if you
                  believe this is a mistake.
                </p>
              </div>
            </div>
          )}

          {isActive && isVerified && (
            <div className="flex items-center gap-3 rounded-2xl border border-teal-400/25 bg-teal-400/[0.06] px-4 py-3 text-sm">
              <CheckCircle
                className="h-5 w-5 flex-shrink-0 text-teal-300"
                strokeWidth={1.5}
              />
              <span className="font-medium text-teal-100">
                Account active &mdash; you&apos;re receiving job requests
              </span>
            </div>
          )}
        </div>

        {/* Edit form */}
        <form action={updateCleanerProfile} className="surface-card mt-6 space-y-7">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300"
            >
              <User className="h-4 w-4 text-teal-300/80" strokeWidth={1.5} />
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={fullProfile?.name ?? ""}
              required
              className="input-dark"
              placeholder="Your full name"
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300"
            >
              <Phone className="h-4 w-4 text-teal-300/80" strokeWidth={1.5} />
              Phone number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={fullProfile?.phone ?? ""}
              className="input-dark"
              placeholder="+1 (250) 000-0000"
            />
          </div>

          <hr className="divider" />

          {/* Areas served */}
          <fieldset>
            <legend className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <MapPin className="h-4 w-4 text-teal-300/80" strokeWidth={1.5} />
              Areas you serve
            </legend>
            <p className="field-hint mt-1">
              Select every town you&apos;re willing to travel to for jobs.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {AREAS.map((area) => (
                <label
                  key={area}
                  className="group flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-teal-400/40 hover:bg-teal-400/[0.06] has-[:checked]:border-teal-400/60 has-[:checked]:bg-teal-400/10"
                >
                  <input
                    type="checkbox"
                    name="areas"
                    value={area}
                    defaultChecked={areasServed.includes(area)}
                    className="h-4 w-4 accent-teal-500"
                  />
                  <span className="text-sm text-slate-200 transition group-hover:text-white">
                    {area}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Availability note (display only — stored in cleaner_details) */}
          {availabilityNote && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-300">
                Availability note
              </p>
              <div className="surface-muted text-sm text-slate-300">
                {availabilityNote}
              </div>
              <p className="field-hint">
                Contact support to update your availability note.
              </p>
            </div>
          )}

          <button type="submit" className="w-full btn-base btn-glow">
            <Save className="h-4 w-4" strokeWidth={2} />
            Save changes
          </button>
        </form>
      </div>
    </main>
  );
}
