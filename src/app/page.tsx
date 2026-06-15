import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";

export default async function Home() {
  const { user } = await getSessionProfile();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-24 px-6 py-20">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          A spotless home in Courtenay, booked in minutes.
        </h1>
        <p className="max-w-2xl text-lg text-gray-600">
          Trusted, ID-verified cleaners at CAD $20 per hour. Pay 60 percent to
          confirm your booking, and the final 40 percent only when the job is
          done right.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/book"
            className="rounded bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Book a cleaning
          </Link>
          {!user && (
            <Link
              href="/login"
              className="rounded border px-6 py-3 font-medium hover:bg-gray-50"
            >
              Log in
            </Link>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-10">
        <h2 className="text-center text-3xl font-bold">How it works</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-lg border p-6">
            <span className="text-sm font-semibold text-blue-600">Step 1</span>
            <h3 className="text-lg font-semibold">Tell us when and where</h3>
            <p className="text-gray-600">
              Pick a date, time, and place. It takes just a couple of minutes.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border p-6">
            <span className="text-sm font-semibold text-blue-600">Step 2</span>
            <h3 className="text-lg font-semibold">
              A nearby verified cleaner accepts
            </h3>
            <p className="text-gray-600">
              A local, ID-verified cleaner accepts your request in real time.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border p-6">
            <span className="text-sm font-semibold text-blue-600">Step 3</span>
            <h3 className="text-lg font-semibold">Pay securely and relax</h3>
            <p className="text-gray-600">
              Confirm with a secure deposit, then pay the rest only when you are
              satisfied.
            </p>
          </div>
        </div>
      </section>

      {/* Why Dust Busters */}
      <section className="flex flex-col gap-10">
        <h2 className="text-center text-3xl font-bold">Why Dust Busters</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-lg border p-6">
            <h3 className="text-lg font-semibold">ID-verified cleaners</h3>
            <p className="text-gray-600">
              Every cleaner is vetted and identity checked before they can take a
              job.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border p-6">
            <h3 className="text-lg font-semibold">Secure Stripe payments</h3>
            <p className="text-gray-600">
              Payments are handled securely through Stripe, so your card details
              stay protected.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border p-6">
            <h3 className="text-lg font-semibold">Private until you confirm</h3>
            <p className="text-gray-600">
              Your address stays private until a cleaner is confirmed for your
              booking.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-3xl font-bold">Simple pricing</h2>
        <p className="text-lg text-gray-600">
          Simple pricing: CAD $20 / hour. No hidden fees.
        </p>
        <Link
          href="/book"
          className="rounded bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          Book a cleaning
        </Link>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center gap-2 border-t pt-8 text-center text-sm text-gray-500">
        <div className="flex gap-4">
          <Link href="/about" className="hover:text-gray-800">
            About
          </Link>
          <a href="mailto:support@dustbusters.ca" className="hover:text-gray-800">
            support@dustbusters.ca
          </a>
        </div>
        <p>Dust Busters, home cleaning in Courtenay, BC.</p>
      </footer>
    </main>
  );
}
