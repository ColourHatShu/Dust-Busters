import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Dust Busters collects, uses, and protects your personal information.",
};

const LAST_UPDATED = "June 29, 2026";

const sections = [
  {
    h: "1. Overview",
    p: [
      "This Privacy Policy explains what information Dust Busters collects when you use our home-cleaning marketplace, how we use it, and the choices you have. We collect only what we need to run the service.",
    ],
  },
  {
    h: "2. Information we collect",
    p: [
      "Account: your name, email address, and (optionally) phone number. Bookings: your service address, schedule, hours, area, and any cleaning notes you add. Payments: processed by Stripe — we receive confirmation and amounts, but never your full card number. Usage: basic technical data needed to operate and secure the app.",
    ],
  },
  {
    h: "3. How we use your information",
    p: [
      "To provide the service: create your account, match you with a cleaner, process deposits and balances, send booking and payment notifications, and support reviews and dispute resolution. We do not sell your personal information.",
    ],
  },
  {
    h: "4. How your information is shared",
    p: [
      "With your assigned cleaner: once you confirm a booking with a deposit, the cleaner can see the details needed to do the job, including your address. With service providers: Stripe (payments) and Supabase (secure hosting and database). With authorities only where required by law.",
    ],
  },
  {
    h: "5. Address privacy",
    p: [
      "Your exact address is kept private during matching and is only revealed to a cleaner after you confirm the booking by paying the deposit.",
    ],
  },
  {
    h: "6. Data retention",
    p: [
      "We keep your information for as long as your account is active and as needed to provide the service, comply with legal and tax obligations, resolve disputes, and enforce our agreements.",
    ],
  },
  {
    h: "7. Your rights",
    p: [
      "You can view and update your profile and saved addresses in your account. To request access to, correction of, or deletion of your personal information, email us at support@dustbusters.ca and we will respond within a reasonable time.",
    ],
  },
  {
    h: "8. Cookies and sessions",
    p: [
      "We use essential cookies to keep you signed in and to secure the app. We do not use them for third-party advertising.",
    ],
  },
  {
    h: "9. Security",
    p: [
      "We use industry-standard measures — encrypted connections, scoped database access, and a trusted payment processor — to protect your information. No system is perfectly secure, but we work to keep your data safe.",
    ],
  },
  {
    h: "10. Changes to this policy",
    p: [
      "We may update this policy from time to time; the “Last updated” date above reflects the latest version. Significant changes will be communicated through the app.",
    ],
  },
  {
    h: "11. Contact",
    p: [
      "Questions about your privacy? Email us at support@dustbusters.ca.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <span className="page-eyebrow">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          Legal
        </span>
        <h1 className="page-title mt-3">Privacy Policy</h1>
        <p className="page-subtitle">Last updated: {LAST_UPDATED}</p>
      </header>

      <article className="card card-lg flex flex-col gap-7">
        {sections.map((s) => (
          <section key={s.h} className="flex flex-col gap-2">
            <h2 className="section-title">{s.h}</h2>
            {s.p.map((para, i) => (
              <p key={i} className="text-slate-600">
                {para}
              </p>
            ))}
          </section>
        ))}
      </article>

      <p className="text-sm text-slate-500">
        See also our{" "}
        <Link href="/terms" className="link-accent">
          Terms of Service
        </Link>
        .
      </p>
    </main>
  );
}
