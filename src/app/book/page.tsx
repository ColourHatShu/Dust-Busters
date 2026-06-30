import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AREAS } from "@/lib/areas";
import BookingForm from "./BookingForm";
import { CheckCircle, Sparkles, Wallet } from "lucide-react";

export const metadata = {
  title: "Book a cleaning",
  description:
    "Book a verified local cleaner in the Comox Valley in minutes — pick your date, hours, and area.",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string; area?: string; cleaner?: string }>;
}) {
  const { hours: hoursParam, area: areaParam, cleaner: cleanerParam } =
    await searchParams;
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

  // Book-a-favorite prefill: only honour ?cleaner= if it's one of this
  // customer's favorites (so the dropdown can actually preselect it).
  const prefillCleaner = favorites.some((f) => f.id === cleanerParam)
    ? cleanerParam
    : undefined;

  // Soft min for the date picker (today); the action enforces the real check.
  const minDate = new Date().toISOString().slice(0, 10) + "T00:00";

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      {/* Header (full width) */}
      <div className="space-y-3">
        <span className="page-eyebrow">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          New booking
        </span>
        <div>
          <h1 className="page-title">Book a cleaning</h1>
          <p className="page-subtitle">
            Book a verified local cleaner in the Comox Valley in minutes — pick
            your date, hours, and area.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* MAIN — booking form */}
        <div className="lg:col-span-2 space-y-6">
          <BookingForm
            rate={rate}
            currency={currency}
            depositPercent={depositPercent}
            minDate={minDate}
            areas={AREAS}
            prefillHours={prefillHours}
            prefillArea={prefillArea}
            prefillCleaner={prefillCleaner}
            savedAddresses={savedAddresses ?? []}
            favorites={favorites}
          />
        </div>

        {/* SIDEBAR — pricing, how it works, trust */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* Pricing note */}
          <div className="alert alert-accent">
            <Wallet className="h-5 w-5" strokeWidth={1.75} />
            <div>
              <p className="font-semibold">
                From {currency} ${rate}/hr · {depositPercent}% deposit to confirm
              </p>
              <p className="mt-0.5 opacity-90">
                Pay {depositPercent}% upfront, the rest after the job.
              </p>
            </div>
          </div>

          {/* How it works */}
          <section className="space-y-4">
            <h2 className="section-title">How it works</h2>
            <ol className="card flex flex-col gap-5">
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
                  <span className="icon-tile text-base font-bold">{step}</span>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p className="text-sm text-slate-600">{description}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="alert alert-success">
              <CheckCircle className="h-5 w-5" strokeWidth={2} />
              <span>All cleaners are background-checked and rated by real customers.</span>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
