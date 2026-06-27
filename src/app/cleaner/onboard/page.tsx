import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { AREAS } from "@/lib/areas";
import { becomeCleaner } from "./actions";
import {
  Sparkles,
  MapPin,
  Check,
  ShieldCheck,
  ArrowRight,
  Wallet,
  CalendarClock,
  BadgeCheck,
} from "lucide-react";

const PERKS = [
  {
    icon: CalendarClock,
    title: "Work on your terms",
    body: "Accept the jobs that fit your schedule.",
  },
  {
    icon: Wallet,
    title: "Fair, clear pay",
    body: "Transparent rates, no hidden cuts.",
  },
  {
    icon: BadgeCheck,
    title: "Verified & trusted",
    body: "A vetted badge customers recognise.",
  },
];

export default async function CleanerOnboardPage() {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  return (
    <main className="app-shell">
      <span
        className="section-glow absolute -top-24 left-1/4 h-72 w-72"
        aria-hidden="true"
      />
      <span
        className="section-glow section-glow--sky absolute -top-8 right-1/5 h-64 w-64"
        aria-hidden="true"
      />

      <div className="app-container relative z-10 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <header className="page-header">
            <span className="page-eyebrow">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Join the crew
            </span>
            <h1 className="page-title text-gradient-on-dark">Become a cleaner</h1>
            <p className="page-subtitle">
              Choose the areas you can work in. An admin will verify your ID
              before you start receiving job requests.
            </p>
          </header>

          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            {PERKS.map((perk) => (
              <div key={perk.title} className="surface-muted">
                <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-teal-400/25 bg-emerald-500/10 text-teal-300">
                  <perk.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-slate-100">
                  {perk.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {perk.body}
                </p>
              </div>
            ))}
          </div>

          <form action={becomeCleaner} className="flex flex-col gap-6">
            <fieldset className="surface-card">
              <legend className="float-left flex w-full items-center gap-3 p-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-400/25 bg-gradient-to-br from-emerald-500/20 to-sky-500/10 text-teal-300">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="flex flex-col">
                  <span className="text-base font-semibold text-slate-100">
                    Areas you serve
                  </span>
                  <span className="text-xs text-slate-500">
                    Pick everywhere you&apos;re happy to travel.
                  </span>
                </span>
              </legend>

              <div className="clear-both flex flex-col gap-3 pt-5">
                {AREAS.map((a) => (
                  <label
                    key={a}
                    className="group relative flex cursor-pointer items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-white/20 hover:bg-white/[0.05] has-[:checked]:border-teal-400/50 has-[:checked]:bg-emerald-500/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-400/70 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[#070b14]"
                  >
                    <input
                      type="checkbox"
                      name="areas"
                      value={a}
                      className="peer sr-only"
                    />
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors group-has-[:checked]:border-teal-400/40 group-has-[:checked]:bg-emerald-500/15 group-has-[:checked]:text-teal-300">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="flex flex-col">
                      <span className="font-medium text-slate-100">{a}</span>
                      <span className="text-xs text-slate-500">
                        Vancouver Island
                      </span>
                    </span>
                    <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/15 text-transparent transition-all group-has-[:checked]:border-transparent group-has-[:checked]:bg-gradient-to-br group-has-[:checked]:from-emerald-500 group-has-[:checked]:to-teal-500 group-has-[:checked]:text-white">
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button className="btn-base btn-glow w-full">
              <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
              Join as a cleaner
              <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>

            <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-400/70" aria-hidden="true" />
              ID verification keeps every cleaner and customer safe.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
