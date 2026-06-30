import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { AREAS } from "@/lib/areas";
import { Sparkles, ArrowRight, ChevronDown } from "lucide-react";
import HeroBackdrop from "@/components/landing/HeroBackdrop";
import CountUp from "@/components/landing/CountUp";
import HowItWorks from "@/components/landing/sections/HowItWorks";
import WhyTrust from "@/components/landing/sections/WhyTrust";
import Assurance from "@/components/landing/sections/Assurance";
import Pricing from "@/components/landing/sections/Pricing";
import ServiceAreas from "@/components/landing/sections/ServiceAreas";
import FinalCta from "@/components/landing/sections/FinalCta";

export default async function Home() {
  const { user } = await getSessionProfile();
  const isCustomer = user?.role === "customer";

  // LocalBusiness structured data for local SEO / rich results. Static + invisible.
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: "Dust Busters",
    description:
      "Book a trusted, ID-verified home cleaner in Courtenay and the Comox Valley, BC. Real-time matching, secure deposit, and pay the balance only when the job is done right.",
    url: siteUrl,
    image: `${siteUrl}/opengraph-image`,
    email: "support@dustbusters.ca",
    priceRange: "$$",
    serviceType: "Home cleaning",
    areaServed: [...AREAS, "Comox Valley"].map((name) => ({
      "@type": "City",
      name,
    })),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Courtenay",
      addressRegion: "BC",
      addressCountry: "CA",
    },
  };

  return (
    <main className="landing-grain flex w-full flex-col bg-[#070b14]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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

      {/* ── The rest of the landing, redesigned dark + futuristic ── */}
      <HowItWorks />
      <WhyTrust />
      <Assurance />
      <Pricing />
      <ServiceAreas />
      <FinalCta />
    </main>
  );
}
