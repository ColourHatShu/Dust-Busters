import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarRange,
  Filter,
  Inbox,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminSearch from "../AdminSearch";

// Real booking_status enum values (no 'pending'/'confirmed').
// Values map each status onto a shared dark-theme status pill variant while
// keeping the original semantic hue intent (blue→info, green→success, etc.).
const statusColor: Record<string, string> = {
  broadcasting: "pill-info",
  accepted: "pill-warning",
  deposit_paid: "pill-success",
  in_progress: "pill-accent",
  completed: "pill-info",
  balance_paid: "pill-success",
  closed: "pill-neutral",
  cancelled: "pill-danger",
  no_cleaner_found: "pill-danger",
  disputed: "pill-warning",
};
const STATUSES = Object.keys(statusColor);

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/");

  let bookingsQuery = supabase
    .from("bookings")
    .select(
      `id, status, area, scheduled_at, hours, total_amount, created_at,
       customer:profiles!bookings_customer_id_fkey(name),
       cleaner:profiles!bookings_cleaner_id_fkey(name)`
    )
    .order("created_at", { ascending: false });
  if (q) bookingsQuery = bookingsQuery.ilike("area", `%${q}%`);
  if (status && STATUSES.includes(status)) {
    bookingsQuery = bookingsQuery.eq("status", status);
  }
  const { data: bookings } = await bookingsQuery;

  const rows = bookings ?? [];
  const count = rows.length;
  const hasFilters = Boolean(q) || Boolean(status);

  return (
    <main className="app-shell">
      <span
        className="section-glow absolute -top-32 left-1/4 h-72 w-72"
        aria-hidden="true"
      />
      <span
        className="section-glow section-glow--sky absolute right-0 top-24 h-64 w-64"
        aria-hidden="true"
      />

      <div className="app-container relative z-10 py-10 sm:py-14">
        {/* Back link */}
        <Link
          href="/admin"
          className="link-accent mb-8 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          Admin
        </Link>

        {/* Page header */}
        <header className="page-header">
          <span className="page-eyebrow">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
            Operations
          </span>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="page-title text-gradient-on-dark">Bookings</h1>
            <span className="pill pill-neutral self-center sm:self-end">
              {count} {count === 1 ? "booking" : "bookings"}
            </span>
          </div>
          <p className="page-subtitle">
            Every job across the marketplace — search by service area or narrow
            the list by lifecycle status.
          </p>
        </header>

        {/* Filter & search */}
        <section className="surface-card mb-8">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            Filter &amp; search
          </div>

          <AdminSearch placeholder="Search bookings by area" defaultValue={q}>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="input-dark w-auto"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </AdminSearch>

          {hasFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4 text-xs">
              <span className="text-faint">Active filters:</span>
              {q && (
                <span className="pill pill-info">
                  <span className="pill-dot" />
                  area: “{q}”
                </span>
              )}
              {status && (
                <span className="pill pill-accent">
                  <span className="pill-dot" />
                  {status.replace(/_/g, " ")}
                </span>
              )}
              <Link href="/admin/bookings" className="link-accent ml-1 font-medium">
                Clear all
              </Link>
            </div>
          )}
        </section>

        {/* Bookings table */}
        <div className="table-wrap">
          <div className="overflow-x-auto">
            <table className="table-dark min-w-[46rem]">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Cleaner</th>
                  <th>Status</th>
                  <th>Area</th>
                  <th>Scheduled</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex flex-col items-center gap-3 py-16 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
                          <Inbox className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <p className="text-sm font-medium text-slate-200">
                          No bookings found
                        </p>
                        <p className="text-xs text-faint">
                          Try adjusting your search or status filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((b) => {
                    const customer = Array.isArray(b.customer)
                      ? b.customer[0]
                      : b.customer;
                    const cleaner = Array.isArray(b.cleaner)
                      ? b.cleaner[0]
                      : b.cleaner;
                    return (
                      <tr key={b.id}>
                        <td className="font-mono text-xs text-slate-500">
                          {String(b.id).slice(0, 8)}
                        </td>
                        <td className="font-medium text-slate-100">
                          {customer?.name ?? "—"}
                        </td>
                        <td className={cleaner?.name ? "text-slate-300" : "text-slate-500"}>
                          {cleaner?.name ?? "—"}
                        </td>
                        <td>
                          <span
                            className={`pill ${statusColor[b.status] ?? "pill-neutral"}`}
                          >
                            <span className="pill-dot" />
                            {b.status?.replace(/_/g, " ") ?? "—"}
                          </span>
                        </td>
                        <td className="text-slate-300">{b.area ?? "—"}</td>
                        <td className="whitespace-nowrap text-slate-400">
                          {b.scheduled_at
                            ? new Date(b.scheduled_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap text-right font-medium tabular-nums text-slate-100">
                          {b.total_amount != null
                            ? `$${Number(b.total_amount).toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/admin/bookings/${b.id}`}
                            className="link-accent inline-flex items-center gap-1 text-xs font-medium"
                          >
                            View
                            <ArrowUpRight
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
