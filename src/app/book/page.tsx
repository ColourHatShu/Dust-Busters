import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AREAS } from "@/lib/areas";
import BookingForm from "./BookingForm";
import { ShieldCheck, Sparkles } from "lucide-react";

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
    <main className="app-shell relative overflow-hidden">
      {/* Ambient aurora glows behind the booking flow */}
      <span
        className="section-glow absolute -top-24 left-1/4 h-72 w-72"
        aria-hidden="true"
      />
      <span
        className="section-glow section-glow--sky absolute top-44 -right-16 h-72 w-72"
        aria-hidden="true"
      />

      <div className="app-container relative z-10 max-w-xl space-y-12 py-14 sm:py-16">
        {/* Header + pricing note */}
        <header className="page-header">
          <span className="page-eyebrow">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            New booking
          </span>
          <h1 className="page-title text-gradient-on-dark">Book a cleaning</h1>
          <p className="page-subtitle">
            Pick your date, hours, and area — we&apos;ll match you with a verified
            local cleaner in the Comox Valley in minutes.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="pill pill-accent">
              From {currency} ${rate}/hr
            </span>
            <span className="pill pill-success">
              {depositPercent}% deposit to confirm
            </span>
          </div>
          <p className="text-sm text-faint">
            Pay {depositPercent}% upfront, the rest after the job.
          </p>
        </header>

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
        <section className="space-y-5">
          <h2 className="text-lg font-semibold text-slate-100">How it works</h2>
          <ol className="flex flex-col gap-3">
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
              <li key={step} className="surface-muted flex items-start gap-4">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-bold text-slate-950 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.7)]">
                  {step}
                </span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-100">{title}</p>
                  <p className="text-sm text-dim">{description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="surface-muted flex items-center gap-3 text-sm text-dim">
            <ShieldCheck
              className="h-5 w-5 flex-shrink-0 text-emerald-400"
              strokeWidth={1.75}
            />
            <span>
              All cleaners are background-checked and rated by real customers.
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
