import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import {
  Shield,
  Clock,
  Star,
  MapPin,
  CreditCard,
  CheckCircle,
  Sparkles,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import HeroBackdrop from "@/components/landing/HeroBackdrop";
import Reveal from "@/components/landing/Reveal";
import CountUp from "@/components/landing/CountUp";

export default async function Home() {
  const { user } = await getSessionProfile();
  const isCustomer = user?.role === "customer";

  return (
    <main className="flex w-full flex-col">
      {/* ── Hero ── */}
      <section className="hero-shell flex w-full flex-col items-center px-6 pb-28 pt-24 text-center sm:pt-28">
        <HeroBackdrop />

        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8">
          <span className="glass-chip anim-rise delay-1 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-emerald-200">
            <Sparkles className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Now serving the Comox Valley
          </span>

          <h1 className="anim-rise delay-2 max-w-4xl text-balance">
            <span className="text-white">Reliable </span>
            <span className="title-gradient">home cleaning</span>
            <br />
            <span className="text-3xl text-slate-200 sm:text-5xl">
              in Courtenay &amp; area
            </span>
          </h1>

          <p className="anim-rise delay-3 mx-auto max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Verified local cleaners, on-demand booking, secure payments — book in
            minutes and watch us match you with a cleaner in real time.
          </p>

          <div className="anim-rise delay-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/book"
              className="btn-base btn-glow group px-8 py-4 text-base"
            >
              {isCustomer ? "Book Now" : "Book a Cleaning"}
              <ArrowRight
                className="h-5 w-5 transition-transform group-hover:translate-x-1"
                strokeWidth={2}
                aria-hidden="true"
              />
            </Link>
            <a
              href="#how-it-works"
              className="btn-base btn-glass px-8 py-4 text-base"
            >
              How it works
            </a>
          </div>

          {/* Stats */}
          <div className="anim-rise delay-5 mt-6 flex flex-wrap items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-1">
              <CountUp
                to={50}
                suffix="+"
                className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-3xl font-bold text-transparent"
              />
              <span className="text-sm text-slate-400">cleans completed</span>
            </div>
            <div className="hidden h-12 w-px bg-white/15 sm:block" />
            <div className="flex flex-col items-center gap-1">
              <CountUp
                to={100}
                suffix="%"
                className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-3xl font-bold text-transparent"
              />
              <span className="text-sm text-slate-400">ID-verified cleaners</span>
            </div>
            <div className="hidden h-12 w-px bg-white/15 sm:block" />
            <div className="flex flex-col items-center gap-1">
              <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-3xl font-bold text-transparent">
                Secure
              </span>
              <span className="text-sm text-slate-400">Stripe payments</span>
            </div>
          </div>

          <a
            href="#how-it-works"
            className="scroll-cue mt-10 text-slate-400 transition hover:text-emerald-300"
            aria-label="Scroll to how it works"
          >
            <ChevronDown className="h-6 w-6" strokeWidth={1.5} />
          </a>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="w-full bg-slate-50 py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6">
          <Reveal className="space-y-3 text-center">
            <h2>How it works</h2>
            <p className="text-slate-600">Three simple steps to a spotless home</p>
          </Reveal>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: 1,
                title: "Book online in 2 minutes",
                body: "Pick your date, number of hours, and area. No phone calls needed.",
              },
              {
                step: 2,
                title: "We match you with a verified cleaner",
                body: "The first available ID-verified cleaner in your area accepts your booking in real time.",
              },
              {
                step: 3,
                title: "Pay securely, only when satisfied",
                body: "A 60% deposit confirms your booking. The remaining 40% is charged only after the job is done.",
              },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 120}>
                <div className="card card-lift flex h-full flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white shadow-md">
                      {s.step}
                    </span>
                    <h3>{s.title}</h3>
                  </div>
                  <p className="text-slate-600">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="w-full py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6">
          <Reveal className="space-y-3 text-center">
            <h2>Why Dust Busters?</h2>
            <p className="text-slate-600">
              Built on trust, transparency, and local roots
            </p>
          </Reveal>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Shield,
                title: "ID-verified cleaners",
                body: "Every cleaner is identity-checked and vetted before they can accept a job.",
              },
              {
                icon: CreditCard,
                title: "Secure Stripe payments",
                body: "Industry-standard encryption. Your card details are never stored on our servers.",
              },
              {
                icon: Clock,
                title: "Real-time updates",
                body: "Track your booking status from confirmation to completion, all in one place.",
              },
              {
                icon: Star,
                title: "Local & reliable",
                body: "Cleaners who live in your community and take pride in their work.",
              },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 100}>
                <div className="card card-lift flex h-full flex-col gap-4">
                  <div className="icon-container text-white">
                    <f.icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <h3>{f.title}</h3>
                  <p className="text-sm text-slate-600">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="w-full px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="pricing-section">
              <h2 className="text-white">Simple pricing</h2>
              <p className="text-lg text-slate-300">
                From{" "}
                <span className="text-4xl font-bold text-gradient-on-dark">$20</span>
                <span className="text-slate-300"> / hr CAD</span>
              </p>
              <div className="flex flex-col items-center gap-2 text-sm text-slate-400">
                {[
                  "60% deposit to confirm your booking",
                  "40% balance paid only after the job is done",
                  "No hidden fees. No surprises.",
                ].map((line) => (
                  <div key={line} className="flex items-center gap-2">
                    <CheckCircle
                      className="h-4 w-4 text-emerald-400"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
              <Link href="/book" className="btn-base btn-primary px-8 py-4 text-base">
                Book now
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Service areas ── */}
      <section className="w-full bg-slate-50 py-20">
        <Reveal className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 text-center">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" strokeWidth={2} aria-hidden="true" />
              <h2>We serve</h2>
            </div>
            <p className="text-slate-600">Proudly serving the Comox Valley</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {["Courtenay", "Comox", "Cumberland"].map((area) => (
              <span
                key={area}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-6 py-2 text-sm font-medium text-emerald-800"
              >
                {area}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Footer CTA ── */}
      <section className="w-full py-24">
        <Reveal className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 text-center">
          <h2>Ready for a clean home?</h2>
          <p className="max-w-md text-slate-600">
            Book in minutes. Pay securely. Relax while we handle the rest.
          </p>
          <Link href="/book" className="btn-base btn-primary group px-10 py-4 text-base">
            Book a Cleaning
            <ArrowRight
              className="h-5 w-5 transition-transform group-hover:translate-x-1"
              strokeWidth={2}
              aria-hidden="true"
            />
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
