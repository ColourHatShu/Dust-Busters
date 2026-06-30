import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bookingBadgeClass, bookingStatusLabel } from "@/lib/status";
import {
  ClipboardList,
  Users,
  Sparkles,
  AlertTriangle,
  Settings,
  DollarSign,
  ShieldCheck,
  Flag,
  Tag,
  Plus,
} from "lucide-react";

export default async function AdminHomePage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "admin") redirect("/");

  const supabase = await createClient();

  // 1. Total bookings count
  const { count: totalBookings } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true });

  // 2. Bookings by status (+ created_at for the weekly trend below)
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("status, created_at");
  const statusCounts: Record<string, number> = {};
  for (const b of allBookings ?? []) {
    statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1;
  }

  // 3. Total revenue: sum paid payments in JS. A refund already removes its
  // revenue by flipping the original deposit to status "refunded", so it drops
  // from this "paid" sum automatically; excluding the separate negative "refund"
  // row prevents subtracting the refund a second time (revenue is net-of-refunds,
  // counted once — never negative or double-reduced).
  const { data: paidPayments } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .eq("status", "paid")
    .neq("type", "refund");
  const totalRevenue = (paidPayments ?? []).reduce(
    (sum, p) => sum + Number(p.amount ?? 0),
    0
  );
  // Revenue booked in the current calendar month (UTC month boundary).
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
  const monthRevenue = (paidPayments ?? []).reduce(
    (sum, p) =>
      sum + (p.paid_at && p.paid_at >= monthStart ? Number(p.amount ?? 0) : 0),
    0
  );

  // Realized platform commission vs cleaner payouts (from fully-settled bookings).
  const { data: settled } = await supabase
    .from("bookings")
    .select("platform_fee, cleaner_payout, status")
    .in("status", ["balance_paid", "closed"]);
  let platformRevenue = 0;
  let cleanerPayouts = 0;
  for (const b of settled ?? []) {
    platformRevenue += Number(b.platform_fee ?? 0);
    cleanerPayouts += Number(b.cleaner_payout ?? 0);
  }
  const money = (n: number) =>
    n.toLocaleString("en-CA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Weekly trend (last 8 rolling 7-day windows): bookings created + revenue paid.
  const WEEKS = 8;
  const WEEK_MS = 7 * 86_400_000;
  const nowMs = Date.now();
  const bookingsByWeek = new Array(WEEKS).fill(0);
  const revenueByWeek = new Array(WEEKS).fill(0);
  for (const b of allBookings ?? []) {
    if (!b.created_at) continue;
    const w = Math.floor((nowMs - new Date(b.created_at).getTime()) / WEEK_MS);
    if (w >= 0 && w < WEEKS) bookingsByWeek[WEEKS - 1 - w] += 1;
  }
  for (const p of paidPayments ?? []) {
    if (!p.paid_at) continue;
    const w = Math.floor((nowMs - new Date(p.paid_at).getTime()) / WEEK_MS);
    if (w >= 0 && w < WEEKS) revenueByWeek[WEEKS - 1 - w] += Number(p.amount ?? 0);
  }
  const maxBookings = Math.max(1, ...bookingsByWeek);
  const trend = bookingsByWeek.map((count, i) => ({
    count,
    revenue: revenueByWeek[i],
    // window-end date for the bar label
    label: new Date(nowMs - (WEEKS - 1 - i) * WEEK_MS).toLocaleDateString(
      "en-CA",
      { month: "numeric", day: "numeric" },
    ),
    barPx: Math.max(4, Math.round((count / maxBookings) * 96)),
  }));
  const trendBookings = bookingsByWeek.reduce((s, n) => s + n, 0);
  const trendRevenue = revenueByWeek.reduce((s, n) => s + n, 0);

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

  // "Active" = bookings still in flight (not completed/closed/cancelled/etc.).
  const activeCount = ["broadcasting", "accepted", "deposit_paid", "in_progress"].reduce(
    (sum, st) => sum + (statusCounts[st] ?? 0),
    0
  );

  const navCards = [
    { href: "/admin/bookings", label: "Bookings", icon: ClipboardList, desc: "Manage all bookings" },
    { href: "/admin/customers", label: "Customers", icon: Users, desc: "View customer accounts" },
    { href: "/admin/cleaners", label: "Cleaners", icon: Sparkles, desc: "Manage cleaner roster" },
    { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle, desc: "Resolve open disputes" },
    { href: "/admin/reports", label: "Reports", icon: Flag, desc: "Flagged chat messages" },
    { href: "/admin/promos", label: "Promo codes", icon: Tag, desc: "Discounts & referrals" },
    { href: "/admin/addons", label: "Add-ons", icon: Plus, desc: "Paid extras menu" },
    { href: "/admin/settings", label: "Settings", icon: Settings, desc: "App configuration" },
  ];

  const disputesOpen = (openDisputes ?? 0) > 0;

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="page-eyebrow">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            Admin
          </span>
          <h1 className="page-title mt-2">Admin Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {profile?.name ?? "Admin"} — here&apos;s your overview
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="stat-card">
          <div className="flex items-start justify-between gap-3">
            <p className="stat-label">Total Bookings</p>
            <span className="icon-tile icon-tile-sm icon-tile-info">
              <ClipboardList className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </div>
          <p className="stat-value">{totalBookings ?? 0}</p>
          <p className="stat-sub">
            {activeCount} active · {statusCounts["completed"] ?? 0} completed
          </p>
        </div>

        <div className="stat-card stat-card-accent">
          <div className="flex items-start justify-between gap-3">
            <p className="stat-label">Revenue (CAD)</p>
            <span className="icon-tile icon-tile-sm">
              <DollarSign className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </div>
          <p className="stat-value">${money(totalRevenue)}</p>
          <p className="stat-sub">all-time · ${money(monthRevenue)} this month</p>
          <div className="mt-1 space-y-0.5 border-t border-emerald-200/60 pt-1.5">
            <p className="flex justify-between text-xs text-slate-500">
              <span>Platform (commission)</span>
              <span className="font-medium text-emerald-700 tabular-nums">
                ${money(platformRevenue)}
              </span>
            </p>
            <p className="flex justify-between text-xs text-slate-500">
              <span>Cleaner payouts</span>
              <span className="font-medium text-slate-700 tabular-nums">
                ${money(cleanerPayouts)}
              </span>
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between gap-3">
            <p className="stat-label">Active Cleaners</p>
            <span className="icon-tile icon-tile-sm icon-tile-soft">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </div>
          <p className="stat-value">{activeCleaners ?? 0}</p>
          <p className="stat-sub">available for dispatch</p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between gap-3">
            <p className="stat-label">Open Disputes</p>
            <span
              className={`icon-tile icon-tile-sm ${disputesOpen ? "icon-tile-danger" : "icon-tile-neutral"}`}
            >
              <AlertTriangle className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </div>
          <p className={`stat-value ${disputesOpen ? "text-red-600!" : ""}`}>
            {openDisputes ?? 0}
          </p>
          <p className="stat-sub">
            {disputesOpen ? "requires attention" : "all clear"}
          </p>
        </div>
      </div>

      {/* Nav Cards */}
      <div>
        <h2 className="eyebrow-label mb-3">Manage</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {navCards.map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="card card-interactive p-4 flex flex-col items-center text-center gap-2 group"
            >
              <span className="icon-tile">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-slate-800 group-hover:text-accent-light transition-colors">
                {label}
              </span>
              <span className="text-xs text-slate-400 hidden sm:block">{desc}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Weekly trend */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">Last 8 weeks</h2>
          <span className="text-sm text-slate-500">
            {trendBookings} booking{trendBookings === 1 ? "" : "s"} · $
            {money(trendRevenue)}
          </span>
        </div>
        <div className="flex items-end gap-2" style={{ height: "120px" }}>
          {trend.map((t, i) => (
            <div
              key={i}
              className="flex flex-1 flex-col items-center justify-end gap-1"
              title={`${t.count} booking${t.count === 1 ? "" : "s"} · $${money(t.revenue)}`}
            >
              <span className="text-xs font-medium text-slate-500">{t.count}</span>
              <div
                className="w-full rounded-t bg-emerald-400"
                style={{ height: `${t.barPx}px` }}
              />
              <span className="text-[0.65rem] text-slate-400">{t.label}</span>
            </div>
          ))}
        </div>
        <p className="form-hint">
          Bookings created per week (hover a bar for its revenue).
        </p>
      </section>

      {/* Recent Bookings + Booking Status Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 card card-flush overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-5 sm:p-6">
            <h2 className="section-title">Recent Bookings</h2>
            <Link href="/admin/bookings" className="link-accent text-sm">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Area</th>
                <th>Scheduled</th>
                <th className="num">Hrs</th>
                <th className="num">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(recentBookings ?? []).length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <span className="empty-state-icon">
                        <ClipboardList className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                      </span>
                      <p className="empty-state-title">No bookings yet</p>
                      <p className="empty-state-text">
                        New bookings will appear here as customers place them.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {(recentBookings ?? []).map((b) => {
                const customer = Array.isArray(b.profiles)
                  ? b.profiles[0]
                  : b.profiles;
                return (
                  <tr key={b.id}>
                    <td>
                      <span className="font-mono text-xs text-slate-400">
                        {String(b.id).slice(0, 8)}
                      </span>
                    </td>
                    <td className="font-medium text-slate-700">
                      {customer?.name ?? "—"}
                    </td>
                    <td>
                      <span className={bookingBadgeClass(b.status)}>
                        {bookingStatusLabel(b.status)}
                      </span>
                    </td>
                    <td>{b.area ?? "—"}</td>
                    <td className="whitespace-nowrap">
                      {b.scheduled_at
                        ? new Date(b.scheduled_at).toLocaleString("en-CA", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="num">
                      {b.hours != null ? `${b.hours}h` : "—"}
                    </td>
                    <td className="num font-medium text-slate-800">
                      {b.total_amount != null
                        ? `$${Number(b.total_amount).toFixed(2)}`
                        : "—"}
                    </td>
                    <td>
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="link-accent text-xs"
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

        {/* Booking Status Breakdown */}
        {Object.keys(statusCounts).length > 0 && (
          <aside className="card">
            <h2 className="section-title mb-3">Booking Status Breakdown</h2>
            <div className="flex flex-wrap gap-2.5">
              {Object.entries(statusCounts).map(([status, count]) => (
                <span key={status} className={bookingBadgeClass(status)}>
                  {bookingStatusLabel(status)}
                  <span className="font-bold">{count}</span>
                </span>
              ))}
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
