import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ClipboardList, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bookingBadgeClass, bookingStatusLabel } from "@/lib/status";
import AdminSearch from "../AdminSearch";

// Real booking_status enum values (no 'pending'/'confirmed').
const STATUSES = [
  "broadcasting",
  "accepted",
  "deposit_paid",
  "in_progress",
  "completed",
  "balance_paid",
  "closed",
  "cancelled",
  "no_cleaner_found",
  "disputed",
];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { q, status, from, to } = await searchParams;
  // Only trust well-formed YYYY-MM-DD values for the date-range filter.
  const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
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
  // Date-range filter on the scheduled date (inclusive of the whole "to" day).
  if (isDate(from)) {
    bookingsQuery = bookingsQuery.gte("scheduled_at", `${from}T00:00:00`);
  }
  if (isDate(to)) {
    bookingsQuery = bookingsQuery.lte("scheduled_at", `${to}T23:59:59.999`);
  }
  const { data: bookings } = await bookingsQuery;

  const rows = bookings ?? [];

  // Carry the active filters into the CSV export so it exports what's shown.
  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (status && STATUSES.includes(status)) exportParams.set("status", status);
  if (isDate(from)) exportParams.set("from", from!);
  if (isDate(to)) exportParams.set("to", to!);
  const exportHref = `/admin/bookings/export${
    exportParams.toString() ? `?${exportParams}` : ""
  }`;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <Link
        href="/admin"
        className="link-subtle mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Admin
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">
            {rows.length} {rows.length === 1 ? "booking" : "bookings"}
            {status ? ` · ${bookingStatusLabel(status)}` : ""}
            {isDate(from) || isDate(to)
              ? ` · ${isDate(from) ? from : "any"} → ${isDate(to) ? to : "any"}`
              : ""}
          </p>
        </div>
        {rows.length > 0 && (
          <a href={exportHref} className="btn-base btn-secondary text-sm" download>
            <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Export CSV
          </a>
        )}
      </div>

      <AdminSearch placeholder="Search bookings by area" defaultValue={q}>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="input-modern w-auto"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {bookingStatusLabel(s)}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={isDate(from) ? from : ""}
          className="input-modern w-auto"
          aria-label="Scheduled from date"
        />
        <input
          type="date"
          name="to"
          defaultValue={isDate(to) ? to : ""}
          className="input-modern w-auto"
          aria-label="Scheduled to date"
        />
      </AdminSearch>

      <div className="card card-flush overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Cleaner</th>
              <th>Status</th>
              <th>Area</th>
              <th>Scheduled</th>
              <th className="num">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <span className="empty-state-icon">
                      <ClipboardList className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <p className="empty-state-title">No bookings found</p>
                    <p className="empty-state-text">
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
                    <td className="font-mono text-xs text-slate-400">
                      {String(b.id).slice(0, 8)}
                    </td>
                    <td className="font-medium text-slate-700">
                      {customer?.name ?? "—"}
                    </td>
                    <td>{cleaner?.name ?? "—"}</td>
                    <td>
                      <span className={bookingBadgeClass(b.status)}>
                        {bookingStatusLabel(b.status)}
                      </span>
                    </td>
                    <td>{b.area ?? "—"}</td>
                    <td className="whitespace-nowrap">
                      {b.scheduled_at
                        ? new Date(b.scheduled_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="num font-medium text-slate-700">
                      {b.total_amount != null
                        ? `$${Number(b.total_amount).toFixed(2)}`
                        : "—"}
                    </td>
                    <td>
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="link-accent text-xs font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
