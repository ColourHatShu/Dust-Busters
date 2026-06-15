import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AREAS } from "@/lib/areas";
import { submitBooking } from "./actions";

export default async function BookPage() {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("hourly_rate, currency, deposit_percent")
    .eq("id", 1)
    .single();
  const rate = Number(settings?.hourly_rate ?? 20);
  const currency = settings?.currency ?? "CAD";

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-1 text-2xl font-bold">Book a cleaning</h1>
      <p className="mb-6 text-sm text-gray-600">
        {currency} ${rate}/hour. You pay {settings?.deposit_percent ?? 60}% to
        confirm once a cleaner accepts, and the rest after the job is done.
      </p>

      <form action={submitBooking} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Date and time
          <input
            type="datetime-local"
            name="scheduled_at"
            required
            className="rounded border p-2 font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          How many hours?
          <input
            type="number"
            name="hours"
            min={1}
            max={12}
            step={1}
            defaultValue={3}
            required
            className="rounded border p-2 font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Area
          <select name="area" required className="rounded border p-2 font-normal">
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Full address
          <input
            type="text"
            name="full_address"
            required
            placeholder="Street, unit, city"
            className="rounded border p-2 font-normal"
          />
          <span className="text-xs font-normal text-gray-500">
            Your exact address stays hidden from cleaners until you have paid the
            deposit to a verified cleaner.
          </span>
        </label>

        <button className="rounded bg-blue-600 p-3 font-medium text-white">
          Find a cleaner
        </button>
      </form>
    </main>
  );
}
