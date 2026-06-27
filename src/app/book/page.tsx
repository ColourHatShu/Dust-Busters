import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AREAS } from "@/lib/areas";
import BookingForm from "./BookingForm";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Book a cleaning",
  description:
    "Book a verified local cleaner in the Comox Valley in minutes — pick your date, hours, and area.",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string; area?: string }>;
}) {
  const { hours: hoursParam, area: areaParam } = await searchParams;
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  // "Book again" prefill (validated; address is never passed in the URL).
  const prefillHours =
    hoursParam &&
    Number.isInteger(Number(hoursParam)) &&
    Number(hoursParam) >= 1 &&
    Number(hoursParam) <= 12
      ? Number(hoursParam)
      : 3;
  const prefillArea = (AREAS as readonly string[]).includes(areaParam ?? "")
    ? areaParam
    : undefined;

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("hourly_rate, currency, deposit_percent")
    .eq("id", 1)
    .single();
  const rate = Number(settings?.hourly_rate ?? 20);
  const currency = settings?.currency ?? "CAD";
  const depositPercent = Number(settings?.deposit_percent ?? 60);

  const { data: savedAddresses } = await supabase
    .from("saved_addresses")
    .select("id, label, full_address")
    .eq("customer_id", user.id)
    .returns<{ id: string; label: string | null; full_address: string }[]>();

  // Favorite cleaners (for "book a favorite directly").
  const { data: favRows } = await supabase
    .from("customer_favorites")
    .select("cleaner_id")
    .eq("customer_id", user.id)
    .returns<{ cleaner_id: string }[]>();
  const favorites = await Promise.all(
    (favRows ?? []).map(async (f) => {
      const { data } = await supabase.rpc("get_cleaner_card", {
        p_cleaner: f.cleaner_id,
      });
      const card = (Array.isArray(data) ? data[0] : data) as
        | { name?: string }
        | null;
      return { id: f.cleaner_id, name: card?.name ?? "Cleaner" };
    }),
  );

  // Soft min for the date picker (today); the action enforces the real check.
  const minDate = new Date().toISOString().slice(0, 10) + "T00:00";

  return (
    <main className="mx-auto max-w-lg space-y-10 p-6">
      {/* Header + pricing note */}
      <div className="space-y-4">
        <h1>Book a cleaning</h1>
        <p className="text-slate-600">
          <span className="font-semibold text-accent">
            From {currency} ${rate}/hr
          </span>{" "}
          •{" "}
          <span className="font-semibold text-accent">
            {depositPercent}% deposit
          </span>{" "}
          to confirm
          <br />
          <span className="text-sm">
            Pay {depositPercent}% upfront, the rest after the job.
          </span>
        </p>
      </div>

      <BookingForm
        rate={rate}
        currency={currency}
        depositPercent={depositPercent}
        minDate={minDate}
        areas={AREAS}
        prefillHours={prefillHours}
        prefillArea={prefillArea}
        savedAddresses={savedAddresses ?? []}
        favorites={favorites}
      />

      {/* How it works */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">How it works</h2>
        <ol className="flex flex-col gap-4">
          {[
            {
              step: 1,
              title: "Book",
              description:
                "Fill in your details and we'll find you a vetted local cleaner.",
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
