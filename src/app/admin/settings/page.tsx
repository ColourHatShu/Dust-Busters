import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateSettings } from "./actions";

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
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>
      <form action={updateSettings} className="space-y-4">
        <div>
          <label htmlFor="hourly_rate" className="mb-1 block text-sm font-medium">
            Hourly Rate
          </label>
          <input
            id="hourly_rate"
            name="hourly_rate"
            type="number"
            step="0.01"
            defaultValue={settings?.hourly_rate ?? ""}
            className="w-full rounded border p-2"
          />
        </div>
        <div>
          <label
            htmlFor="deposit_percent"
            className="mb-1 block text-sm font-medium"
          >
            Deposit Percent
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
            className="w-full rounded border p-2"
          />
        </div>
        <div>
          <label
            htmlFor="commission_percent"
            className="mb-1 block text-sm font-medium"
          >
            Platform commission %
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
            className="w-full rounded border p-2"
          />
          <p className="mt-1 text-xs text-slate-500">
            Applied to new bookings going forward (existing bookings keep their
            locked rate).
          </p>
        </div>
        <button
          type="submit"
          className="rounded bg-green-600 px-3 py-1 text-white"
        >
          Save
        </button>
      </form>
    </main>
  );
}
