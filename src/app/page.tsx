import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { Shield, Clock, Star, MapPin, CreditCard, CheckCircle } from "lucide-react";

export default async function Home() {
  const { user } = await getSessionProfile();
  const isCustomer = user?.role === "customer";

  return (
    <main className="flex w-full flex-col">

      {/* ── Hero ── */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 px-6 py-24 text-center">
        <div className="space-y-6">
          <h1>
            <span className="text-gradient">Reliable home cleaning</span>
            <br />
            <span className="text-4xl sm:text-5xl">in Courtenay &amp; area</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
            Verified local cleaners, on-demand booking, secure payments
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/book" className="btn-base btn-primary text-base px-8 py-4">
            {isCustomer ? "Book Now" : "Book a Cleaning"}
          </Link>
          <a href="#how-it-works" className="btn-base btn-secondary text-base px-8 py-4">
            How it works
          </a>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap justify-center gap-8 pt-4">
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-gradient">50+</span>
            <span className="text-sm text-slate-500">cleans completed</span>
          </div>
          <div className="h-12 w-px bg-slate-200 hidden sm:block" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-gradient">100%</span>
            <span className="text-sm text-slate-500">ID-verified cleaners</span>
          </div>
          <div className="h-12 w-px bg-slate-200 hidden sm:block" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-gradient">Secure</span>
            <span className="text-sm text-slate-500">payments</span>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        id="how-it-works"
        className="w-full bg-slate-50 py-24"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6">
          <div className="text-center space-y-3">
            <h2>How it works</h2>
            <p className="text-slate-600">Three simple steps to a spotless home</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {/* Step 1 */}
            <div className="card flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold text-lg shadow-md shrink-0">
                  1
                </span>
                <h3>Book online in 2 minutes</h3>
              </div>
              <p className="text-slate-600">
                Pick your date, number of hours, and area. No phone calls needed.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold text-lg shadow-md shrink-0">
                  2
                </span>
                <h3>We match you with a verified cleaner</h3>
              </div>
              <p className="text-slate-600">
                The first available ID-verified cleaner in your area accepts your booking in real time.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold text-lg shadow-md shrink-0">
                  3
                </span>
                <h3>Pay securely, only after you're satisfied</h3>
              </div>
              <p className="text-slate-600">
                A 60% deposit confirms your booking. The remaining 40% is charged only after the job is done.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust / Why Dust Busters ── */}
      <section className="w-full py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6">
          <div className="text-center space-y-3">
            <h2>Why Dust Busters?</h2>
            <p className="text-slate-600">Built on trust, transparency, and local roots</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card flex flex-col gap-4">
              <div className="icon-container text-white">
                <Shield className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3>ID-verified cleaners</h3>
              <p className="text-slate-600 text-sm">
                Every cleaner is identity-checked and vetted before they can accept a job.
              </p>
            </div>

            <div className="card flex flex-col gap-4">
              <div className="icon-container text-white">
                <CreditCard className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3>Secure Stripe payments</h3>
              <p className="text-slate-600 text-sm">
                Industry-standard encryption. Your card details are never stored on our servers.
              </p>
            </div>

            <div className="card flex flex-col gap-4">
              <div className="icon-container text-white">
                <Clock className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3>Real-time updates</h3>
              <p className="text-slate-600 text-sm">
                Track your booking status from confirmation to completion, all in one place.
              </p>
            </div>

            <div className="card flex flex-col gap-4">
              <div className="icon-container text-white">
                <Star className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3>Local &amp; reliable</h3>
              <p className="text-slate-600 text-sm">
                Cleaners who live in your community and take pride in their work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="w-full py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="pricing-section">
            <h2 className="text-white">Simple pricing</h2>
            <p className="text-lg text-slate-300">
              From{" "}
              <span className="text-4xl font-bold text-gradient-on-dark">$20</span>
              <span className="text-slate-300"> / hr CAD</span>
            </p>
            <div className="flex flex-col items-center gap-2 text-slate-400 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                <span>60% deposit to confirm your booking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                <span>40% balance paid only after the job is done</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                <span>No hidden fees. No surprises.</span>
              </div>
            </div>
            <Link href="/book" className="btn-base btn-primary text-base px-8 py-4">
              Book now
            </Link>
          </div>
        </div>
      </section>

      {/* ── Service areas ── */}
      <section className="w-full bg-slate-50 py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 text-center">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" strokeWidth={2} />
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
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="w-full py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 text-center">
          <h2>Ready for a clean home?</h2>
          <p className="max-w-md text-slate-600">
            Book in minutes. Pay securely. Relax while we handle the rest.
          </p>
          <Link href="/book" className="btn-base btn-primary text-base px-10 py-4">
            Book a Cleaning
          </Link>
        </div>
      </section>

    </main>
  );
}
