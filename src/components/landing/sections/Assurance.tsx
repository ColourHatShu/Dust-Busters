import Reveal from "@/components/landing/Reveal";
import {
  ShieldCheck,
  BadgeCheck,
  CreditCard,
  MapPin,
  type LucideIcon,
} from "lucide-react";

type Promise = {
  icon: LucideIcon;
  title: string;
  detail: string;
};

/**
 * Honest assurances only — every line maps to a real product guarantee:
 * deferred balance, ID verification, Stripe encryption, local ownership.
 * No reviews, ratings, or invented numbers.
 */
const PROMISES: Promise[] = [
  {
    icon: ShieldCheck,
    title: "Pay only when satisfied",
    detail: "Balance charged after the clean",
  },
  {
    icon: BadgeCheck,
    title: "ID-verified local cleaners",
    detail: "Vetted before they accept a job",
  },
  {
    icon: CreditCard,
    title: "Secure Stripe payments",
    detail: "Encrypted; cards never stored",
  },
  {
    icon: MapPin,
    title: "Locally owned",
    detail: "Rooted in the Comox Valley",
  },
];

/**
 * Slim, dark glass "assurance band" that sits between the trust and pricing
 * sections. Reinforces real guarantees with small glowing icons and a subtle
 * animated gradient sheen so it reads as part of the futuristic hero world.
 */
export default function Assurance() {
  return (
    <section
      aria-labelledby="assurance-heading"
      className="assure-section relative w-full overflow-hidden px-6 py-10 sm:py-14"
    >
      <span className="assure-halo" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <h2 id="assurance-heading" className="sr-only">
          Our guarantees
        </h2>

        <Reveal>
          <div className="assure-band px-5 py-6 sm:px-8 sm:py-7">
            <span className="assure-sheen" aria-hidden="true" />

            <ul className="relative z-10 flex flex-col gap-y-6 sm:flex-row sm:flex-wrap lg:flex-nowrap lg:items-stretch">
              {PROMISES.map((item, i) => (
                <li
                  key={item.title}
                  className={`flex flex-1 items-center gap-3.5 sm:basis-1/2 sm:px-5 lg:basis-0 ${
                    i > 0 ? "lg:border-l lg:border-white/10" : ""
                  }`}
                >
                  <span
                    className="assure-icon shrink-0"
                    style={{ animationDelay: `${i * 0.7}s` }}
                  >
                    <item.icon
                      className="h-5 w-5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold leading-tight text-slate-100">
                      {item.title}
                    </span>
                    <span className="text-xs leading-snug text-slate-400">
                      {item.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
