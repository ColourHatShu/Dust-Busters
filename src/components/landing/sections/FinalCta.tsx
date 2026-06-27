import Link from "next/link";
import { ArrowRight, Sparkles, Clock, ShieldCheck, MapPin } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

/**
 * Final CTA — a bold, dark, aurora-lit booking band that closes the landing
 * page. Self-contained dark shell (own aurora glows + floating motes) so it
 * reads as part of the futuristic hero family even in isolation.
 *
 * SSR-safe: mote positions are derived deterministically from their index
 * (sine-based pseudo-random), so the server and client markup match — no
 * Math.random()/Date.now() during render.
 */

// Deterministic "dust" motes — identical on server and client.
const CTA_MOTES = Array.from({ length: 14 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin((i + 1) * n) * 10000;
    return x - Math.floor(x); // 0..1
  };
  return {
    left: Math.round(r(12.9898) * 100),
    top: Math.round(r(78.233) * 100),
    size: 2 + Math.round(r(43.123) * 4),
    delay: Math.round(r(7.31) * 9000),
    dur: 9000 + Math.round(r(2.17) * 8000),
    drift: Math.round((r(91.7) - 0.5) * 56),
    op: 0.18 + r(3.7) * 0.45,
  };
});

const TRUST = [
  { icon: Clock, label: "Book in 2 minutes" },
  { icon: ShieldCheck, label: "Secure Stripe payments" },
  { icon: MapPin, label: "Courtenay · Comox · Cumberland" },
] as const;

export default function FinalCta() {
  return (
    <section className="cta-shell w-full px-6 py-28 sm:py-32">
      {/* Decorative backdrop — glows, grid, motes */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <span className="cta-aurora cta-aurora-1" />
        <span className="cta-aurora cta-aurora-2" />
        <div className="cta-grid" />
        <div className="cta-halo" />
        {CTA_MOTES.map((p, i) => (
          <span
            key={i}
            className="cta-mote"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              opacity: p.op,
              // @ts-expect-error custom CSS properties
              "--cta-drift": `${p.drift}px`,
              "--cta-dur": `${p.dur}ms`,
              animationDelay: `${p.delay}ms`,
            }}
          />
        ))}
      </div>

      <Reveal className="mx-auto w-full max-w-4xl">
        <div className="cta-panel flex flex-col items-center gap-7 px-6 py-16 text-center sm:px-14 sm:py-20">
          <span className="glass-chip anim-rise delay-1 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-emerald-200">
            <Sparkles className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Ready when you are
          </span>

          <h2 className="cta-title anim-rise delay-2 max-w-2xl text-balance text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Ready for a <span className="title-gradient">clean home</span>?
          </h2>

          <p className="anim-rise delay-3 max-w-md text-base leading-relaxed text-slate-300 sm:text-lg">
            Book in minutes. Pay securely. Relax while we handle the rest.
          </p>

          <Link
            href="/book"
            className="btn-base btn-glow anim-rise delay-4 group mt-1 px-10 py-4 text-base"
          >
            Book a Cleaning
            <ArrowRight
              className="h-5 w-5 transition-transform group-hover:translate-x-1"
              strokeWidth={2}
              aria-hidden="true"
            />
          </Link>

          <ul className="anim-rise delay-5 mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {TRUST.map((t) => (
              <li
                key={t.label}
                className="flex items-center gap-2 text-sm text-slate-400"
              >
                <t.icon
                  className="h-4 w-4 text-emerald-400"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span>{t.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
