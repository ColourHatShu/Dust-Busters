import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";

export default async function Home() {
  const { user, profile } = await getSessionProfile();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">Dust Busters</h1>
      <p className="text-lg text-gray-600">
        Trusted home cleaning in Courtenay, BC. Book in minutes, pay securely,
        and only pay the rest once the job is done right.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/book"
          className="rounded bg-blue-600 px-6 py-3 font-medium text-white"
        >
          Book a cleaning
        </Link>
        {!user && (
          <Link href="/login" className="rounded border px-6 py-3 font-medium">
            Log in / Sign up
          </Link>
        )}
        {user && profile?.role === "cleaner" && (
          <Link
            href="/cleaner/jobs"
            className="rounded border px-6 py-3 font-medium"
          >
            View job requests
          </Link>
        )}
        {user && profile?.role === "customer" && (
          <Link
            href="/cleaner/onboard"
            className="rounded border px-6 py-3 font-medium"
          >
            Become a cleaner
          </Link>
        )}
        {user && profile?.role === "admin" && (
          <Link
            href="/admin/cleaners"
            className="rounded border px-6 py-3 font-medium"
          >
            Admin
          </Link>
        )}
      </div>
    </main>
  );
}
