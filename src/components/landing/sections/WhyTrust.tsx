"use client";

import type { PointerEvent } from "react";
import {
  Shield,
  CreditCard,
  Clock,
  Star,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Reveal from "@/components/landing/Reveal";

type Pillar = {
  icon: LucideIcon;
  title: string;
  body: string;
};

const PILLARS: Pillar[] = [
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
];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * "Why Dust Busters?" — dark, futuristic grid of glass trust pillars.
 * Pointer-tracked tilt + inner spotlight mirror the hero's cursor interaction;
 * glowing gradient icon tiles, animated conic borders, and staggered reveals
 * keep it cohesive with the animated hero. SSR-safe (no render-time randomness;
 * all interactivity is wired through pointer handlers on the client).
 */
export default function WhyTrust() {
  function handleMove(e: PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--trust-mx", `${(px * 100).toFixed(2)}%`);
    el.style.setProperty("--trust-my", `${(py * 100).toFixed(2)}%`);
    el.style.setProperty("--trust-lift", "-6px");
    if (!prefersReducedMotion()) {
      el.style.setProperty("--trust-ry", `${((px - 0.5) * 9).toFixed(2)}deg`);
      el.style.setProperty("--trust-rx", `${((0.5 - py) * 9).toFixed(2)}deg`);
    }
  }

  function handleLeave(e: PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    el.style.setProperty("--trust-lift", "0px");
    el.style.setProperty("--trust-rx", "0deg");
    el.style.setProperty("--trust-ry", "0deg");
  }

  return (
    <section className="trust-section w-full overflow-hidden py-24 sm:py-28">
      <span className="trust-glow trust-glow-a" aria-hidden="true" />
      <span className="trust-glow trust-glow-b" aria-hidden="true" />
      <div className="trust-grid" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-14 px-6">
        <Reveal className="flex flex-col items-center gap-4 text-center">
          <span className="glass-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-emerald-200">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Trust &amp; safety
          </span>
          <h2 className="text-balance text-white">
            Why <span className="title-gradient">Dust Busters</span>?
          </h2>
          <p className="max-w-xl text-slate-400">
            Built on trust, transparency, and local roots.
          </p>
        </Reveal>

        <ul className="grid list-none grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <Reveal as="li" key={pillar.title} delay={i * 110}>
                <div
                  className={`trust-card trust-card--${i + 1} h-full`}
                  onPointerMove={handleMove}
                  onPointerLeave={handleLeave}
                >
                  <span className="trust-card-spot" aria-hidden="true" />
                  <div className="relative z-10 flex h-full flex-col gap-4">
                    <span className="trust-icon" aria-hidden="true">
                      <Icon className="h-6 w-6" strokeWidth={1.75} />
                    </span>
                    <h3 className="text-lg font-semibold text-white">
                      {pillar.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-400">
                      {pillar.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
