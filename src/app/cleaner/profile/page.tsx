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
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your cleaner profile and service areas
        </p>
      </div>

      {/* Verification / active status notices */}
      {!isVerified && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
          <ShieldAlert
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600"
            strokeWidth={1.5}
          />
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
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <ShieldCheck className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
          <span className="font-medium">ID verified</span>
        </div>
      )}

      {!isActive && (
        <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 flex-shrink-0"
            strokeWidth={1.5}
          />
          <div>
            <p className="font-semibold">Account inactive</p>
            <p className="mt-0.5">
              Your account is currently inactive. Contact support if you believe
              this is a mistake.
            </p>
          </div>
        </div>
      )}

      {isActive && isVerified && (
        <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
          <span className="font-medium">
            Account active &mdash; you&apos;re receiving job requests
          </span>
        </div>
      )}

      {/* Edit form */}
      <form action={updateCleanerProfile} className="card space-y-6">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="name"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
          >
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
          <label
            htmlFor="phone"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
          >
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
          <legend className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <MapPin className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
            Areas you serve
          </legend>
          <div className="mt-2 flex flex-col gap-2">
            {AREAS.map((area) => (
              <label
                key={area}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-2.5 transition hover:border-teal-300 hover:bg-teal-50 has-[:checked]:border-teal-400 has-[:checked]:bg-teal-50"
              >
                <input
                  type="checkbox"
                  name="areas"
                  value={area}
                  defaultChecked={areasServed.includes(area)}
                  className="h-4 w-4 accent-teal-600"
                />
                <span className="text-sm text-slate-700">{area}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Availability note (display only — stored in cleaner_details) */}
        {availabilityNote && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-slate-700">
              Availability note
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {availabilityNote}
            </div>
            <p className="text-xs text-slate-400">
              Contact support to update your availability note.
            </p>
          </div>
        )}

        <button type="submit" className="w-full btn-base btn-primary">
          Save changes
        </button>
      </form>
    </main>
  );
}
