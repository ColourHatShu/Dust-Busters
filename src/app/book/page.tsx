import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AREAS } from "@/lib/areas";
import { submitBooking } from "./actions";
import PriceEstimator from "./PriceEstimator";
import { Calendar, MapPin, Home, Lock, CheckCircle } from "lucide-react";

export const metadata = {
  title: "Book a cleaning",
  description:
    "Book a verified local cleaner in the Comox Valley in minutes — pick your date, hours, and area.",
};

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
  const depositPercent = Number(settings?.deposit_percent ?? 60);
  // Soft min for the date picker (today); the server action enforces the real
  // future-date check.
  const minDate = new Date().toISOString().slice(0, 10) + "T00:00";

  return (
    <main className="mx-auto max-w-lg space-y-10 p-6">
      {/* Header + pricing note */}
      <div className="space-y-4">
        <h1>Book a cleaning</h1>
        <p className="text-slate-600">
          <span className="font-semibold text-accent">
            From {currency} ${rate}/hr
          </span>
          {" "}•{" "}
          <span className="font-semibold text-accent">{depositPercent}% deposit</span>{" "}
          to confirm
          <br />
          <span className="text-sm">
            Pay {depositPercent}% upfront, the rest after the job.
          </span>
        </p>
      </div>

      {/* Booking form */}
      <form action={submitBooking} className="card flex flex-col gap-8">
        <label className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" strokeWidth={1.5} />
            <span className="text-sm font-medium text-slate-900">Date and time</span>
          </div>
          <input
            type="datetime-local"
            name="scheduled_at"
            required
            min={minDate}
            className="input-modern"
          />
        </label>

        <PriceEstimator
          rate={rate}
          depositPercent={depositPercent}
          currency={currency}
        />

        <label className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" strokeWidth={1.5} />
            <span className="text-sm font-medium text-slate-900">Area</span>
          </div>
          <select name="area" required className="input-modern">
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-accent" strokeWidth={1.5} />
            <span className="text-sm font-medium text-slate-900">Full address</span>
          </div>
          <input
            type="text"
            name="full_address"
            required
            placeholder="Street, unit, city"
            className="input-modern"
          />
          <div className="flex items-start gap-2 text-xs text-slate-500">
            <Lock className="h-4 w-4 mt-0.5 flex-shrink-0 text-accent" strokeWidth={1.5} />
            <span>Your address stays hidden from cleaners until you've paid the deposit.</span>
          </div>
        </label>

        <button className="btn-base btn-primary mt-6">Find a cleaner</button>
      </form>

      {/* How it works */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">How it works</h2>
        <ol className="flex flex-col gap-4">
          {[
            {
              step: 1,
              title: "Book",
              description:
                "Fill in your details and we'll find you a vetted local cleaner. No account needed to browse.",
            },
            {
              step: 2,
              title: "We match a cleaner",
              description:
                "A cleaner accepts your job and you're notified. Pay the deposit to lock in your slot.",
            },
            {
              step: 3,
              title: "Relax",
              description:
                "Your cleaner arrives on time. Pay the remaining balance after you're satisfied.",
            },
          ].map(({ step, title, description }) => (
            <li key={step} className="flex items-start gap-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                {step}
              </span>
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="text-sm text-slate-600">{description}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" strokeWidth={2} />
          <span>All cleaners are background-checked and rated by real customers.</span>
        </div>
      </section>
    </main>
  );
}
