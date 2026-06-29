import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateSettings } from "./actions";
import { ArrowLeft, DollarSign, Percent, SlidersHorizontal } from "lucide-react";

export default async function AdminSettingsPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "admin") redirect("/");

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("hourly_rate, deposit_percent, commission_percent")
    .eq("id", 1)
    .single();

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="mb-6">
        <Link
          href="/admin"
          className="link-subtle inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Admin
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="icon-tile">
            <SlidersHorizontal className="h-5 w-5" />
          </span>
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Pricing and platform commission</p>
          </div>
        </div>
      </div>

      <form action={updateSettings} className="card space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="hourly_rate" className="form-label">
            <DollarSign className="h-4 w-4" /> Hourly Rate
          </label>
          <input
            id="hourly_rate"
            name="hourly_rate"
            type="number"
            step="0.01"
            defaultValue={settings?.hourly_rate ?? ""}
            className="input-modern"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="deposit_percent" className="form-label">
            <Percent className="h-4 w-4" /> Deposit Percent
          </label>
          <input
            id="deposit_percent"
            name="deposit_percent"
            type="number"
            step="0.01"
            min="0"
            max="100"
            required
            defaultValue={settings?.deposit_percent ?? ""}
            className="input-modern"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="commission_percent" className="form-label">
            <Percent className="h-4 w-4" /> Platform commission %
          </label>
          <input
            id="commission_percent"
            name="commission_percent"
            type="number"
            step="0.01"
            min="0"
            max="100"
            required
            defaultValue={settings?.commission_percent ?? ""}
            className="input-modern"
          />
          <p className="form-hint">
            Applied to new bookings going forward (existing bookings keep their
            locked rate).
          </p>
        </div>
        <hr className="hr-soft" />
        <button type="submit" className="btn-base btn-primary">
          Save
        </button>
      </form>
    </main>
  );
}
