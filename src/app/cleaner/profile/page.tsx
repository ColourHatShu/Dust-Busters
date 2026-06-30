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
  FileText,
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
    .select("areas_served, id_verified, active, availability_note, bio")
    .eq("profile_id", user.id)
    .single();

  const areasServed: string[] = details?.areas_served ?? [];
  const isVerified = details?.id_verified ?? false;
  const isActive = details?.active ?? false;
  const availabilityNote = details?.availability_note ?? "";
  const bio = details?.bio ?? "";

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">
          Manage your cleaner profile and service areas
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* MAIN: edit form */}
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-2">
          <form action={updateCleanerProfile} className="card space-y-6">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="form-label">
                <User className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={fullProfile?.name ?? ""}
                required
                className="input-modern"
                placeholder="Your full name"
              />
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="form-label">
                <Phone className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                Phone number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={fullProfile?.phone ?? ""}
                className="input-modern"
                placeholder="+1 (250) 000-0000"
              />
            </div>

            {/* Areas served */}
            <fieldset className="flex flex-col gap-2">
              <legend className="form-label">
                <MapPin className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                Areas you serve
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {AREAS.map((area) => (
                  <label key={area} className="checkbox-card">
                    <input
                      type="checkbox"
                      name="areas"
                      value={area}
                      defaultChecked={areasServed.includes(area)}
                    />
                    <span>{area}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* About me — shown to customers on the booking cleaner card */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bio" className="form-label">
                <FileText className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                About me
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                maxLength={600}
                defaultValue={bio}
                className="input-modern"
                placeholder="A short intro for customers — your experience, what you specialise in, and how you like to work. (e.g. '5 years cleaning homes in the Comox Valley, pet-friendly, eco products on request.')"
              />
              <p className="form-hint">
                Shown to customers when you&apos;re matched. Keep it friendly and
                professional — no contact details.
              </p>
            </div>

            <button type="submit" className="w-full btn-base btn-primary">
              Save changes
            </button>
          </form>
        </div>

        {/* SIDEBAR: account status + availability note */}
        <aside className="order-1 space-y-6 lg:order-2 lg:sticky lg:top-24 lg:self-start">
          {/* Verification / active status notices */}
          {!isVerified && (
            <div className="alert alert-warning">
              <ShieldAlert className="h-5 w-5" strokeWidth={1.5} />
              <div>
                <p className="font-semibold">ID verification pending</p>
                <p className="mt-0.5">
                  Your ID verification is pending admin review. You&apos;ll start
                  receiving job offers once approved.
                </p>
              </div>
            </div>
          )}

          {isVerified && (
            <div className="alert alert-success">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
              <span className="font-medium">ID verified</span>
            </div>
          )}

          {!isActive && (
            <div className="alert alert-error">
              <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
              <div>
                <p className="font-semibold">Account inactive</p>
                <p className="mt-0.5">
                  Your account is currently inactive. Contact support if you
                  believe this is a mistake.
                </p>
              </div>
            </div>
          )}

          {isActive && isVerified && (
            <div className="alert alert-accent">
              <CheckCircle className="h-5 w-5" strokeWidth={1.5} />
              <span className="font-medium">
                Account active &mdash; you&apos;re receiving job requests
              </span>
            </div>
          )}

          {/* Availability note (display only — stored in cleaner_details) */}
          {availabilityNote && (
            <div className="flex flex-col gap-1.5">
              <p className="form-label">Availability note</p>
              <div className="surface-muted px-4 py-3 text-sm text-slate-600">
                {availabilityNote}
              </div>
              <p className="form-hint">
                Contact support to update your availability note.
              </p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
