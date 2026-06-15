import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";

export default async function Nav() {
  const { user, profile } = await getSessionProfile();

  return (
    <nav className="flex items-center gap-4 border-b px-6 py-4">
      <Link href="/" className="font-bold">
        Dust Busters
      </Link>

      <div className="ml-auto flex items-center gap-4">
        {!user && (
          <Link href="/login" className="text-sm font-medium">
            Log in
          </Link>
        )}

        {user && (
          <>
            <Link href="/book" className="text-sm font-medium">
              Book
            </Link>

            {profile?.role === "customer" && (
              <>
                <Link href="/bookings" className="text-sm font-medium">
                  My bookings
                </Link>
                <Link href="/cleaner/onboard" className="text-sm font-medium">
                  Become a cleaner
                </Link>
              </>
            )}

            {profile?.role === "cleaner" && (
              <Link href="/cleaner/jobs" className="text-sm font-medium">
                Job requests
              </Link>
            )}

            {profile?.role === "admin" && (
              <Link href="/admin" className="text-sm font-medium">
                Admin
              </Link>
            )}

            <form action="/auth/signout" method="post">
              <button type="submit" className="text-sm font-medium">
                Log out
              </button>
            </form>
          </>
        )}
      </div>
    </nav>
  );
}
