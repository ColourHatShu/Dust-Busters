import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of Dust Busters — booking cleanings, payments, cancellations, and more.",
};

const LAST_UPDATED = "June 29, 2026";

const sections = [
  {
    h: "1. Agreement to these terms",
    p: [
      "Dust Busters (“we”, “us”) operates an online platform that connects customers in the Comox Valley, BC with independent local cleaners. By creating an account or booking a cleaning, you agree to these Terms of Service. If you do not agree, please do not use the service.",
    ],
  },
  {
    h: "2. The service",
    p: [
      "Dust Busters is a marketplace. We help you request a home cleaning, match you with an available, ID-verified local cleaner, and handle secure payment. Cleaners are independent contractors, not employees of Dust Busters; we facilitate the booking and payment but do not directly perform the cleaning.",
    ],
  },
  {
    h: "3. Your account",
    p: [
      "You are responsible for the accuracy of the information you provide and for keeping your login credentials secure. You must be at least 18 years old and able to enter into a binding contract to use the service.",
    ],
  },
  {
    h: "4. Bookings and matching",
    p: [
      "When you request a cleaning, we broadcast it to eligible cleaners in your area. Once a cleaner accepts, you confirm the booking by paying a deposit. If no cleaner is available, you will be notified and may search again. Your exact address is kept private until a booking is confirmed.",
    ],
  },
  {
    h: "5. Payments, deposits, and balances",
    p: [
      "Pricing is shown before you book (an hourly rate over the hours you select). To confirm a booking you pay a deposit; the remaining balance is due after the cleaning is complete. Payments are processed securely by Stripe — we never see or store your full card details.",
      "Dust Busters retains a platform commission on each completed job; the remainder is the cleaner’s payout.",
    ],
  },
  {
    h: "6. Cancellations and refunds",
    p: [
      "You may cancel a booking from the booking page. If you cancel at least 24 hours before the scheduled start and a deposit was paid, the deposit is refunded to your original payment method. Cancellations within 24 hours may forfeit the deposit, which compensates the cleaner for the reserved time. Refunds are issued via Stripe and may take a few business days to appear.",
    ],
  },
  {
    h: "7. Cleaners and conduct",
    p: [
      "Cleaners on the platform are vetted and identity-checked. Both customers and cleaners are expected to behave respectfully and lawfully. We may suspend or remove any account that abuses the service, the platform, or another user.",
    ],
  },
  {
    h: "8. Reviews",
    p: [
      "After a completed job, customers and cleaners may leave a review. Reviews must be honest, relevant, and respectful. We may remove reviews that are abusive, fraudulent, or violate these terms.",
    ],
  },
  {
    h: "9. Issues and disputes",
    p: [
      "If something goes wrong with a cleaning, you can report an issue from the booking page. Our team reviews reports and may pause related payments while we investigate, and will work with both parties toward a fair resolution.",
    ],
  },
  {
    h: "10. Liability",
    p: [
      "The service is provided “as is”. To the fullest extent permitted by law, Dust Busters is not liable for the acts or omissions of independent cleaners beyond our role in facilitating the booking, nor for indirect or consequential damages. Nothing in these terms limits liability that cannot be limited under applicable law.",
    ],
  },
  {
    h: "11. Changes to these terms",
    p: [
      "We may update these terms from time to time. Material changes will be reflected by the “Last updated” date above, and continued use of the service after a change means you accept the updated terms.",
    ],
  },
  {
    h: "12. Contact",
    p: [
      "Questions about these terms? Email us at support@dustbusters.ca.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <span className="page-eyebrow">
          <ScrollText className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          Legal
        </span>
        <h1 className="page-title mt-3">Terms of Service</h1>
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
        <Link href="/privacy" className="link-accent">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
