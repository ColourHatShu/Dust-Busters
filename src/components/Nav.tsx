import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import NavClient, { type NavLink } from "./NavClient";

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

  const links: NavLink[] = [];
  if (user) {
    links.push({ href: "/book", label: "Book" });
    if (profile?.role === "customer") {
      links.push({ href: "/bookings", label: "My bookings" });
      links.push({ href: "/cleaner/onboard", label: "Become a cleaner" });
    }
    if (profile?.role === "cleaner") {
      links.push({ href: "/cleaner/jobs", label: "Job requests" });
      links.push({ href: "/cleaner/earnings", label: "Earnings" });
      links.push({ href: "/cleaner/profile", label: "Profile" });
    }
    if (profile?.role === "admin") {
      links.push({ href: "/admin", label: "Admin" });
    }
  }

  return <NavClient loggedIn={!!user} links={links} unreadCount={unreadCount} />;
}
