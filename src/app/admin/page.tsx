import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardList,
  Users,
  Sparkles,
  AlertTriangle,
  Settings,
  CalendarCheck,
  Wallet,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
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
  // Map each status to a futuristic-dark pill variant (presentation only).
  const statusColor: Record<string, string> = {
    broadcasting: "pill-info",
    accepted: "pill-warning",
    deposit_paid: "pill-success",
    in_progress: "pill-accent",
    completed: "pill-warning",
    balance_paid: "pill-success",
    closed: "pill-neutral",
    cancelled: "pill-danger",
    no_cleaner_found: "pill-danger",
    disputed: "pill-danger",
  };

  // "Active" = bookings still in flight (not completed/closed/cancelled/etc.).
  const activeCount = ["broadcasting", "accepted", "deposit_paid", "in_progress"].reduce(
    (sum, st) => sum + (statusCounts[st] ?? 0),
    0
  );

  const navCards = [
    { href: "/admin/bookings", label: "Bookings", Icon: ClipboardList, desc: "Manage all bookings" },
    { href: "/admin/customers", label: "Customers", Icon: Users, desc: "View customer accounts" },
    { href: "/admin/cleaners", label: "Cleaners", Icon: Sparkles, desc: "Manage cleaner roster" },
    { href: "/admin/disputes", label: "Disputes", Icon: AlertTriangle, desc: "Resolve open disputes" },
    { href: "/admin/settings", label: "Settings", Icon: Settings, desc: "App configuration" },
  ];

  const hasDisputes = (openDisputes ?? 0) > 0;
  const chipBase =
    "inline-flex h-11 w-11 items-center justify-center rounded-xl border";
  const chipAccent =
    "border-teal-300/20 bg-gradient-to-br from-emerald-500/20 to-sky-500/10 text-teal-300";

  return (
    <main className="app-shell relative min-h-screen overflow-hidden pb-16 pt-10 sm:pt-12">
      {/* Ambient aurora glows */}
      <span aria-hidden className="section-glow absolute -top-24 left-1/4 h-72 w-72" />
      <span aria-hidden className="section-glow section-glow--sky absolute -top-12 right-6 h-64 w-64" />

      <div className="app-container relative space-y-10">
        {/* Header */}
        <header className="page-header">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <span className="page-eyebrow">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                Admin Console
              </span>
              <h1 className="page-title text-gradient-on-dark">Admin Dashboard</h1>
              <p className="page-subtitle">
                Welcome back, {profile?.name ?? "Admin"} — here&apos;s your overview
              </p>
            </div>
            <span className="pill pill-accent uppercase tracking-wide">
              <span className="pill-dot" />
              Admin
            </span>
          </div>
        </header>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Total Bookings */}
          <div className="surface-card surface-card-interactive">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-dim">
                Total Bookings
              </p>
              <span className={`${chipBase} ${chipAccent}`}>
                <CalendarCheck className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-white">{totalBookings ?? 0}</p>
            <p className="mt-1 text-xs text-faint">
              {activeCount} active · {statusCounts["completed"] ?? 0} completed
            </p>
          </div>

          {/* Revenue */}
          <div className="surface-card surface-card-interactive">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-dim">
                Revenue (CAD)
              </p>
              <span className={`${chipBase} ${chipAccent}`}>
                <Wallet className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-gradient-on-dark">
              ${money(totalRevenue)}
            </p>
            <p className="mt-1 text-xs text-faint">from paid payments</p>
            <div className="mt-4 space-y-1.5 border-t border-white/5 pt-3">
              <div className="flex justify-between text-xs">
                <span className="text-dim">Platform (commission)</span>
                <span className="font-semibold text-emerald-300">
                  ${money(platformRevenue)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dim">Cleaner payouts</span>
                <span className="font-semibold text-slate-200">
                  ${money(cleanerPayouts)}
                </span>
              </div>
            </div>
          </div>

          {/* Active Cleaners */}
          <div className="surface-card surface-card-interactive">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-dim">
                Active Cleaners
              </p>
              <span className={`${chipBase} ${chipAccent}`}>
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-white">{activeCleaners ?? 0}</p>
            <p className="mt-1 text-xs text-faint">available for dispatch</p>
          </div>

          {/* Open Disputes */}
          <div className="surface-card surface-card-interactive">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-dim">
                Open Disputes
              </p>
              <span
                className={`${chipBase} ${
                  hasDisputes
                    ? "border-red-400/30 bg-red-500/15 text-red-300"
                    : chipAccent
                }`}
              >
                <ShieldAlert className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <p
              className={`mt-4 text-3xl font-bold ${
                hasDisputes ? "text-red-400" : "text-white"
              }`}
            >
              {openDisputes ?? 0}
            </p>
            <p className="mt-1 text-xs text-faint">
              {hasDisputes ? "requires attention" : "all clear"}
            </p>
          </div>
        </div>

        {/* Booking Status Breakdown */}
        {Object.keys(statusCounts).length > 0 && (
          <div className="surface-card">
            <h2 className="text-sm font-semibold text-slate-200">
              Booking Status Breakdown
            </h2>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {Object.entries(statusCounts).map(([status, count]) => (
                <span
                  key={status}
                  className={`pill ${statusColor[status] ?? "pill-neutral"}`}
                >
                  <span className="pill-dot" />
                  {status.replace("_", " ")}
                  <span className="font-bold">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Nav Cards */}
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-faint">
            Manage
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {navCards.map(({ href, label, Icon, desc }) => (
              <Link
                key={href}
                href={href}
                className="surface-card surface-card-interactive group flex flex-col items-center gap-3 text-center"
              >
                <span className={`${chipBase} ${chipAccent} transition-transform group-hover:scale-105`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-slate-100 transition-colors group-hover:text-teal-300">
                  {label}
                </span>
                <span className="hidden text-xs text-faint sm:block">{desc}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Bookings */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Bookings</h2>
            <Link
              href="/admin/bookings"
              className="link-accent inline-flex items-center gap-1 text-sm font-medium"
            >
              View all
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="table-wrap">
            <div className="overflow-x-auto">
              <table className="table-dark">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Area</th>
                    <th>Scheduled</th>
                    <th>Hrs</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(recentBookings ?? []).length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-sm text-faint">
                        No bookings yet
                      </td>
                    </tr>
                  )}
                  {(recentBookings ?? []).map((b) => {
                    const customer = Array.isArray(b.profiles)
                      ? b.profiles[0]
                      : b.profiles;
                    return (
                      <tr key={b.id}>
                        <td className="font-mono text-xs text-faint">
                          {String(b.id).slice(0, 8)}
                        </td>
                        <td className="font-medium text-slate-100">
                          {customer?.name ?? "—"}
                        </td>
                        <td>
                          <span
                            className={`pill ${statusColor[b.status] ?? "pill-neutral"}`}
                          >
                            {b.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="text-dim">{b.area ?? "—"}</td>
                        <td className="whitespace-nowrap text-dim">
                          {b.scheduled_at
                            ? new Date(b.scheduled_at).toLocaleString("en-CA", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                        <td className="text-dim">
                          {b.hours != null ? `${b.hours}h` : "—"}
                        </td>
                        <td className="font-semibold text-slate-100">
                          {b.total_amount != null
                            ? `$${Number(b.total_amount).toFixed(2)}`
                            : "—"}
                        </td>
                        <td>
                          <Link
                            href={`/admin/bookings/${b.id}`}
                            className="link-accent inline-flex items-center gap-1 text-xs font-medium"
                          >
                            View
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
