import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminSearch from "../AdminSearch";

// Real booking_status enum values (no 'pending'/'confirmed').
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

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
      </div>
      <AdminSearch placeholder="Search bookings by area" defaultValue={q}>
        <select name="status" defaultValue={status ?? ""} className="input-modern w-auto" aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </AdminSearch>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th className="p-3 font-medium">ID</th>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Cleaner</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Area</th>
              <th className="p-3 font-medium">Scheduled</th>
              <th className="p-3 font-medium">Total</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(bookings ?? []).map((b) => {
              const customer = Array.isArray(b.customer)
                ? b.customer[0]
                : b.customer;
              const cleaner = Array.isArray(b.cleaner) ? b.cleaner[0] : b.cleaner;
              return (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs text-gray-500">
                    {String(b.id).slice(0, 8)}
                  </td>
                  <td className="p-3">{customer?.name ?? "—"}</td>
                  <td className="p-3">{cleaner?.name ?? "—"}</td>
                  <td className="p-3">
                    <span
                      className={`status-badge ${statusColor[b.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3">{b.area ?? "—"}</td>
                  <td className="p-3">
                    {b.scheduled_at
                      ? new Date(b.scheduled_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="p-3">
                    {b.total_amount != null
                      ? `$${Number(b.total_amount).toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="text-blue-600 hover:underline text-xs"
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
    </main>
  );
}
