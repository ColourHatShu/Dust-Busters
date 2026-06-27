import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHomePage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "admin") redirect("/");

  const supabase = await createClient();

  // 1. Total bookings count
  const { count: totalBookings } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true });

  // 2. Bookings by status
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("status");
  const statusCounts: Record<string, number> = {};
  for (const b of allBookings ?? []) {
    statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1;
  }

  // 3. Total revenue: sum paid payments in JS
  const { data: paidPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("status", "paid");
  const totalRevenue = (paidPayments ?? []).reduce(
    (sum, p) => sum + Number(p.amount ?? 0),
    0
  );

  // 4. Active cleaners: profiles with role='cleaner' joined cleaner_details where active=true
  const { count: activeCleaners } = await supabase
    .from("cleaner_details")
    .select("profile_id", { count: "exact", head: true })
    .eq("active", true);

  // 5. Open disputes
  const { count: openDisputes } = await supabase
    .from("disputes")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  // 6. Recent 10 bookings
  const { data: recentBookings } = await supabase
    .from("bookings")
    .select(
      "id, status, area, scheduled_at, hours, total_amount, profiles!bookings_customer_id_fkey(name)"
    )
    .order("created_at", { ascending: false })
    .limit(10);

  // Real booking_status enum values (no 'pending'/'confirmed' exist).
  const statusColor: Record<string, string> = {
    broadcasting: "bg-blue-100 text-blue-800",
    accepted: "bg-yellow-100 text-yellow-800",
    deposit_paid: "bg-green-100 text-green-800",
    in_progress: "bg-indigo-100 text-indigo-800",
    completed: "bg-orange-100 text-orange-800",
    balance_paid: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-800",
    no_cleaner_found: "bg-red-100 text-red-800",
    disputed: "bg-purple-100 text-purple-800",
  };

  // "Active" = bookings still in flight (not completed/closed/cancelled/etc.).
  const activeCount = ["broadcasting", "accepted", "deposit_paid", "in_progress"].reduce(
    (sum, st) => sum + (statusCounts[st] ?? 0),
    0
  );

  const navCards = [
    { href: "/admin/bookings", label: "Bookings", icon: "📋", desc: "Manage all bookings" },
    { href: "/admin/customers", label: "Customers", icon: "👥", desc: "View customer accounts" },
    { href: "/admin/cleaners", label: "Cleaners", icon: "🧹", desc: "Manage cleaner roster" },
    { href: "/admin/disputes", label: "Disputes", icon: "⚠️", desc: "Resolve open disputes" },
    { href: "/admin/settings", label: "Settings", icon: "⚙️", desc: "App configuration" },
  ];

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {profile?.name ?? "Admin"} — here&apos;s your overview
          </p>
        </div>
        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-light uppercase tracking-wide">
          Admin
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Total Bookings
          </p>
          <p className="text-3xl font-bold text-gray-900">{totalBookings ?? 0}</p>
          <p className="text-xs text-gray-400">
            {activeCount} active ·{" "}
            {statusCounts["completed"] ?? 0} completed
          </p>
        </div>

        <div className="card p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Revenue (CAD)
          </p>
          <p className="text-3xl font-bold text-gradient">
            ${totalRevenue.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400">from paid payments</p>
        </div>

        <div className="card p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Active Cleaners
          </p>
          <p className="text-3xl font-bold text-gray-900">{activeCleaners ?? 0}</p>
          <p className="text-xs text-gray-400">available for dispatch</p>
        </div>

        <div className="card p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Open Disputes
          </p>
          <p className={`text-3xl font-bold ${(openDisputes ?? 0) > 0 ? "text-red-600" : "text-gray-900"}`}>
            {openDisputes ?? 0}
          </p>
          <p className="text-xs text-gray-400">
            {(openDisputes ?? 0) > 0 ? "requires attention" : "all clear"}
          </p>
        </div>
      </div>

      {/* Booking Status Breakdown */}
      {Object.keys(statusCounts).length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Booking Status Breakdown</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(statusCounts).map(([status, count]) => (
              <span
                key={status}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusColor[status] ?? "bg-gray-100 text-gray-700"}`}
              >
                {status.replace("_", " ")}
                <span className="font-bold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Nav Cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Manage
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {navCards.map(({ href, label, icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="card p-4 flex flex-col items-center text-center gap-2 hover:shadow-lg transition-shadow group"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-sm font-semibold text-gray-800 group-hover:text-accent-light transition-colors">
                {label}
              </span>
              <span className="text-xs text-gray-400 hidden sm:block">{desc}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
          <Link
            href="/admin/bookings"
            className="text-sm font-medium text-accent-light hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-400">
                <th className="pb-3 pr-4 font-medium">ID</th>
                <th className="pb-3 pr-4 font-medium">Customer</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Area</th>
                <th className="pb-3 pr-4 font-medium">Scheduled</th>
                <th className="pb-3 pr-4 font-medium">Hrs</th>
                <th className="pb-3 pr-4 font-medium">Total</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(recentBookings ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-400 text-sm">
                    No bookings yet
                  </td>
                </tr>
              )}
              {(recentBookings ?? []).map((b) => {
                const customer = Array.isArray(b.profiles)
                  ? b.profiles[0]
                  : b.profiles;
                return (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-400">
                      {String(b.id).slice(0, 8)}
                    </td>
                    <td className="py-3 pr-4 font-medium text-gray-700">
                      {customer?.name ?? "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[b.status] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{b.area ?? "—"}</td>
                    <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                      {b.scheduled_at
                        ? new Date(b.scheduled_at).toLocaleString("en-CA", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {b.hours != null ? `${b.hours}h` : "—"}
                    </td>
                    <td className="py-3 pr-4 font-medium text-gray-800">
                      {b.total_amount != null
                        ? `$${Number(b.total_amount).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="text-xs font-medium text-accent-light hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
