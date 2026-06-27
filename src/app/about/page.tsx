import Link from "next/link";
import type { Metadata } from "next";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  MapPin,
  BadgeCheck,
  HandCoins,
  LockKeyhole,
  HeartHandshake,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "Dust Busters is a local Courtenay home-cleaning service connecting customers with vetted local cleaners.",
};

const values = [
  {
    icon: MapPin,
    title: "Proudly local",
    body: "Born in Courtenay, BC and built for the Comox Valley. Every cleaner lives and works right here in the community.",
  },
  {
    icon: BadgeCheck,
    title: "Vetted & ID-verified",
    body: "Each cleaner on the platform is vetted and identity checked before they ever set foot in your home.",
  },
  {
    icon: HandCoins,
    title: "Honest pricing",
    body: "A flat CAD $20 per hour with no hidden fees. The price you see is the price you pay — nothing buried in the fine print.",
  },
  {
    icon: LockKeyhole,
    title: "Private by default",
    body: "Your address stays private until you confirm a booking, so you stay in control of who knows where you live.",
  },
] as const;

const stats = [
  { value: "$20", label: "per hour, flat" },
  { value: "100%", label: "ID-verified cleaners" },
  { value: "0", label: "hidden fees" },
] as const;

export default function AboutPage() {
  return (
    <main className="app-shell relative overflow-hidden pb-24">
      {/* Ambient glows */}
      <span
        className="section-glow absolute -top-28 left-1/4 h-80 w-80"
        aria-hidden="true"
      />
      <span
        className="section-glow section-glow--sky absolute top-40 -right-16 h-80 w-80"
        aria-hidden="true"
      />

      <div className="app-container relative z-10">
        {/* ---- Hero ---- */}
        <header className="flex flex-col items-start gap-5 pt-20 sm:pt-24">
          <span className="page-eyebrow">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Our story
          </span>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            A spotless home,{" "}
            <span className="text-gradient-on-dark">made effortless</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
            Dust Busters is a local Courtenay, BC home-cleaning service. We
            connect residents with vetted, ID-verified cleaners from right here
            in the community, so booking a trusted cleaning is quick and stress
            free.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/book" className="btn-base btn-glow">
              Book a cleaning
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/" className="btn-base btn-outline">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to home
            </Link>
          </div>
        </header>

        {/* ---- Stats strip ---- */}
        <section
          aria-label="Dust Busters at a glance"
          className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="surface-muted text-center">
              <div className="text-4xl font-bold tracking-tight text-gradient-on-dark">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-dim">{stat.label}</div>
            </div>
          ))}
        </section>

        {/* ---- Story ---- */}
        <section className="mt-16 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="surface-card">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
              Cleaning, the honest way
            </h2>
            <div className="mt-4 space-y-4 text-slate-300">
              <p>
                Our pricing is simple and honest: CAD $20 per hour with no
                hidden fees. You pay a deposit to confirm your booking, and the
                rest is due only once the work is finished and you are happy
                with it.
              </p>
              <p>
                We are proud to be local. Every cleaner on the platform is
                vetted and identity checked, and your address stays private
                until you confirm a booking. Our goal is to make a spotless home
                effortless for the people of the Comox Valley.
              </p>
            </div>

            <hr className="divider-glow my-6" />

            <ul className="space-y-3">
              {[
                "Deposit confirms your booking — balance due only when you're happy",
                "Vetted, identity-checked cleaners on every job",
                "Your address stays private until you confirm",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
                    aria-hidden="true"
                  />
                  <span className="text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mission panel */}
          <div className="panel-elevated relative overflow-hidden p-7">
            <span
              className="section-glow section-glow--teal absolute -top-16 -right-10 h-48 w-48"
              aria-hidden="true"
            />
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/20 to-sky-500/10 text-emerald-300">
              <HeartHandshake className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-100">
              Built for the Comox Valley
            </h2>
            <p className="mt-3 text-slate-300">
              We started Dust Busters to make a trusted clean as easy as a few
              taps — without the markups, the mystery fees, or handing your home
              to a stranger. Local cleaners, fair pay, real accountability.
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm text-dim">
              <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              Trust and privacy, by design.
            </div>
          </div>
        </section>

        {/* ---- Values grid ---- */}
        <section className="mt-16">
          <div className="mb-8 flex flex-col gap-2">
            <span className="page-eyebrow">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              What we stand for
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
              The promises behind every booking
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {values.map(({ icon: Icon, title, body }) => (
              <div key={title} className="surface-card surface-card-interactive">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/20 to-sky-500/10 text-emerald-300">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-100">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Final CTA ---- */}
        <section className="mt-16">
          <div className="surface-card relative overflow-hidden text-center sm:px-10 sm:py-12">
            <span
              className="section-glow absolute -bottom-20 left-1/2 h-64 w-80 -translate-x-1/2"
              aria-hidden="true"
            />
            <div className="relative z-10 flex flex-col items-center gap-4">
              <span className="page-eyebrow">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Ready when you are
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
                Make your home effortless
              </h2>
              <p className="max-w-xl text-slate-300">
                Book a vetted local cleaner in minutes — flat $20/hour, no hidden
                fees, your address private until you confirm.
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                <Link href="/book" className="btn-base btn-glow">
                  Book a cleaning
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/" className="btn-base btn-outline">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to home
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
