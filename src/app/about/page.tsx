import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Dust Busters",
  description:
    "Dust Busters is a local Courtenay home-cleaning service connecting customers with vetted local cleaners.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight">About Dust Busters</h1>

      <p className="text-gray-600">
        Dust Busters is a local Courtenay, BC home-cleaning service. We connect
        residents with vetted, ID-verified cleaners from right here in the
        community, so booking a trusted cleaning is quick and stress free.
      </p>

      <p className="text-gray-600">
        Our pricing is simple and honest: CAD $20 per hour with no hidden fees.
        You pay a deposit to confirm your booking, and the rest is due only once
        the work is finished and you are happy with it.
      </p>

      <p className="text-gray-600">
        We are proud to be local. Every cleaner on the platform is vetted and
        identity checked, and your address stays private until you confirm a
        booking. Our goal is to make a spotless home effortless for the people of
        the Comox Valley.
      </p>

      <div className="flex flex-wrap gap-4 pt-4">
        <Link href="/" className="font-medium text-blue-600 hover:underline">
          Back to home
        </Link>
        <Link href="/book" className="font-medium text-blue-600 hover:underline">
          Book a cleaning
        </Link>
      </div>
    </main>
  );
}
