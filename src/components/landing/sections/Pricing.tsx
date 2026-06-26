import Link from "next/link";
import { Sparkles, CheckCircle2, ShieldCheck, BadgeCheck, ArrowRight } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

/**
 * Pricing — futuristic dark glass pricing card with an animated conic glowing
 * border, a 60/40 deposit-vs-balance split visualizer, a big gradient price and
 * a glowing CTA. Server-rendered (SSR-safe; no random/Date during render); the
 * shared <Reveal> handles scroll-in fade + lift.
 */
export default function Pricing() {
  const bullets = [
    {
      icon: ShieldCheck,
      text: "60% deposit to confirm your booking",
    },
    {
      icon: BadgeCheck,
      text: "40% balance paid only after the job is done",
    },
    {
      icon: CheckCircle2,
      text: "No hidden fees. No surprises.",
    },
  ];

  return (
    <section
      id="pricing"
      className="price-section relative w-full overflow-hidden px-6 py-24 sm:py-28"
    >
      {/* ambient accents */}
      <div className="price-grid" aria-hidden="true" />
      <div className="price-aura price-aura-1" aria-hidden="true" />
      <div className="price-aura price-aura-2" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-xl">
        <Reveal>
          <div className="price-frame">
            <div className="price-card flex flex-col items-center gap-7 p-8 text-center sm:p-10">
              {/* eyebrow */}
              <span className="glass-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-emerald-200">
                <Sparkles className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                Simple pricing
              </span>

              {/* price */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-end justify-center gap-1.5">
                  <span className="pb-2 text-lg font-medium text-slate-400">From</span>
                  <span className="price-amount text-gradient-on-dark text-7xl font-bold leading-none tracking-tight">
                    $20
                  </span>
                  <span className="pb-2 text-lg font-medium text-slate-300">/hr</span>
                </div>
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300/80">
                  CAD
                </span>
              </div>

              {/* 60 / 40 split visualizer */}
              <div className="w-full">
                <div className="mb-2 flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <span className="price-dot price-dot-deposit" aria-hidden="true" />
                    60% deposit
                  </span>
                  <span className="flex items-center gap-1.5 text-sky-300">
                    <span className="price-dot price-dot-balance" aria-hidden="true" />
                    40% balance
                  </span>
                </div>

                <div
                  className="price-split"
                  role="img"
                  aria-label="Payment split: 60 percent deposit to confirm, 40 percent balance after the job"
                >
                  <div className="price-seg price-seg-deposit" />
                  <div className="price-seg price-seg-balance" />
                </div>

                <div className="mt-2 flex items-center justify-between text-[0.7rem] text-slate-500">
                  <span>To confirm your booking</span>
                  <span>After the job is done</span>
                </div>
              </div>

              {/* honest detail bullets */}
              <ul className="flex w-full flex-col gap-2.5 text-left">
                {bullets.map(({ icon: Icon, text }, i) => (
                  <Reveal as="li" key={text} delay={120 + i * 90} className="price-bullet">
                    <Icon
                      className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-slate-200">{text}</span>
                  </Reveal>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="/book"
                className="btn-base btn-glow group mt-1 w-full px-8 py-4 text-base sm:w-auto"
              >
                Book now
                <ArrowRight
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
