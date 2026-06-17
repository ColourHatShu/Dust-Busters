import Link from "next/link";
import { Bell } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function Nav() {
  const { user, profile } = await getSessionProfile();

  let unreadCount = 0;
  if (user) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    unreadCount = count ?? 0;
  }

  return (
    <nav className="navbar mx-auto flex w-full max-w-full items-center gap-4 px-6 py-4">
      <Link href="/" className="text-gradient text-xl font-bold">
        Dust Busters
      </Link>

      <div className="ml-auto flex items-center gap-6">
        {!user && (
          <Link
            href="/login"
            className="text-sm font-medium transition hover:text-accent-light"
          >
            Log in
          </Link>
        )}

        {user && (
          <>
            <Link
              href="/book"
              className="text-sm font-medium transition hover:text-accent-light"
            >
              Book
            </Link>

            {profile?.role === "customer" && (
              <>
                <Link
                  href="/bookings"
                  className="text-sm font-medium transition hover:text-accent-light"
                >
                  My bookings
                </Link>
                <Link
                  href="/cleaner/onboard"
                  className="text-sm font-medium transition hover:text-accent-light"
                >
                  Become a cleaner
                </Link>
              </>
            )}

            {profile?.role === "cleaner" && (
              <Link
                href="/cleaner/jobs"
                className="text-sm font-medium transition hover:text-accent-light"
              >
                Job requests
              </Link>
            )}

            {profile?.role === "admin" && (
              <Link
                href="/admin"
                className="text-sm font-medium transition hover:text-accent-light"
              >
                Admin
              </Link>
            )}

            {/* Notification bell */}
            <Link
              href="/notifications"
              className="relative flex items-center text-current transition hover:text-accent-light"
              aria-label={
                unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "Notifications"
              }
            >
              <Bell className="h-5 w-5" strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold leading-none text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm font-medium transition hover:text-red-300"
              >
                Log out
              </button>
            </form>
          </>
        )}
      </div>
    </nav>
  );
}
