import {
  CalendarClock,
  Radar,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Reveal from "@/components/landing/Reveal";

/**
 * How it works — dark, futuristic 3-step flow.
 * Glowing numbered nodes linked by an animated beam, glass cards with hover glow,
 * staggered scroll reveal. Server-rendered; all motion is CSS (SSR-safe, no
 * client-only randomness). Reduced-motion is gated in the section CSS.
 */

type Step = {
  n: number;
  icon: LucideIcon;
  title: string;
  body: string;
  /** small accent tags shown under the body (decorative, derived from copy) */
  tags: readonly string[];
};

const STEPS: readonly Step[] = [
  {
    n: 1,
    icon: CalendarClock,
    title: "Book online in 2 minutes",
    body: "Pick your date, number of hours, and area. No phone calls needed.",
    tags: ["Date", "Hours", "Area"],
  },
  {
    n: 2,
    icon: Radar,
    title: "We match you with a verified cleaner",
    body: "The first available ID-verified cleaner in your area accepts your booking in real time.",
    tags: ["ID-verified", "Real-time match"],
  },
  {
    n: 3,
    icon: CreditCard,
    title: "Pay securely, only when satisfied",
    body: "A 60% deposit confirms your booking. The remaining 40% is charged only after the job is done.",
    tags: ["Stripe-secured"],
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="hiw-section">
      {/* Ambient backdrop — blends with the dark hero */}
      <div className="hiw-aurora hiw-aurora-a" aria-hidden="true" />
      <div className="hiw-aurora hiw-aurora-b" aria-hidden="true" />
      <div className="hiw-grid" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-6xl px-6 py-24 sm:py-28">
        {/* Heading */}
        <Reveal className="mx-auto max-w-2xl space-y-4 text-center">
          <span className="glass-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-emerald-200">
            <Sparkles className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            How it works
          </span>
          <h2 className="text-gradient-on-dark text-balance">
            Three simple steps to a spotless home
          </h2>
          <p className="text-base leading-relaxed text-slate-400 sm:text-lg">
            From booking to a job well done — transparent, fast, and verified
            every step of the way.
          </p>
        </Reveal>

        {/* Step flow */}
        <div className="hiw-flow mt-16 grid gap-12 sm:mt-20 sm:grid-cols-3 sm:gap-8">
          {/* Animated connecting beam (desktop) — sits behind the nodes */}
          <div className="hiw-rail" aria-hidden="true">
            <span className="hiw-beam" />
          </div>

          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.n} delay={i * 140} className="hiw-col">
                {/* Glowing numbered node */}
                <div className="hiw-node">
                  <span className="hiw-node-ring" aria-hidden="true" />
                  <span className="hiw-node-num">{s.n}</span>
                </div>

                {/* Glass step card */}
                <article className="hiw-card">
                  <span className="hiw-card-sheen" aria-hidden="true" />

                  <div className="hiw-icon">
                    <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                  </div>

                  <h3 className="mt-5 text-lg font-semibold text-slate-100">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {s.body}
                  </p>

                  {/* Step-specific flourish */}
                  {s.n === 2 ? (
                    <div className="hiw-live mt-5">
                      <span className="hiw-live-dot" aria-hidden="true" />
                      <span className="hiw-live-label">Matching in real time</span>
                    </div>
                  ) : null}

                  {s.n === 3 ? (
                    <div className="hiw-split mt-5" aria-hidden="true">
                      <div className="hiw-split-bar">
                        <span className="hiw-split-deposit" />
                        <span className="hiw-split-balance" />
                      </div>
                      <div className="hiw-split-legend">
                        <span>60% deposit</span>
                        <span>40% after</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Accent tags */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {s.tags.map((t) => (
                      <span key={t} className="hiw-chip">
                        {t}
                      </span>
                    ))}
                  </div>
                </article>

                {/* Forward flow cue toward the next step (desktop) */}
                {i < STEPS.length - 1 ? (
                  <ArrowRight
                    className="hiw-arrow"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                ) : null}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
