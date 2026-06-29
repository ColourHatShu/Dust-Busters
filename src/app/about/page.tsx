import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, ShieldCheck, Tag, Lock, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "Dust Busters is a local Courtenay home-cleaning service connecting customers with vetted local cleaners.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-20">
      <header>
        <span className="page-eyebrow">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          About us
        </span>
        <h1 className="page-title mt-3">About Dust Busters</h1>
        <p className="page-subtitle">
          A local Courtenay home-cleaning service connecting residents with
          vetted cleaners from right here in the Comox Valley.
        </p>
      </header>

      <div className="card card-lg flex flex-col gap-5">
        <p className="text-slate-600">
          Dust Busters is a local Courtenay, BC home-cleaning service. We connect
          residents with vetted, ID-verified cleaners from right here in the
          community, so booking a trusted cleaning is quick and stress free.
        </p>

        <p className="text-slate-600">
          Our pricing is simple and honest: CAD $20 per hour with no hidden fees.
          You pay a deposit to confirm your booking, and the rest is due only once
          the work is finished and you are happy with it.
        </p>

        <p className="text-slate-600">
          We are proud to be local. Every cleaner on the platform is vetted and
          identity checked, and your address stays private until you confirm a
          booking. Our goal is to make a spotless home effortless for the people of
          the Comox Valley.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card card-sm flex flex-col gap-3">
          <span className="icon-tile icon-tile-soft" aria-hidden="true">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h2 className="section-title">Vetted &amp; local</h2>
          <p className="text-sm text-slate-600">
            Every cleaner is vetted and ID-verified, from right here in the
            community.
          </p>
        </div>

        <div className="card card-sm flex flex-col gap-3">
          <span className="icon-tile icon-tile-soft" aria-hidden="true">
            <Tag className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h2 className="section-title">Honest pricing</h2>
          <p className="text-sm text-slate-600">
            CAD $20 per hour with no hidden fees &mdash; pay a deposit, the rest
            when you&apos;re happy.
          </p>
        </div>

        <div className="card card-sm flex flex-col gap-3">
          <span className="icon-tile icon-tile-soft" aria-hidden="true">
            <Lock className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h2 className="section-title">Private by default</h2>
          <p className="text-sm text-slate-600">
            Your address stays private until you confirm a booking.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Link href="/book" className="btn-base btn-primary">
          Book a cleaning
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <Link href="/" className="btn-base btn-secondary">
          Back to home
        </Link>
      </div>
    </main>
  );
}
