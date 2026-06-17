import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const statusColor: Record<string, string> = {
  open: "bg-red-100 text-red-800",
  investigating: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-700",
};

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: filterStatus } = await searchParams;

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

  let query = supabase
    .from("disputes")
    .select(
      `id, category, status, description, created_at,
       booking:bookings(id, area, scheduled_at),
       raised_by_profile:profiles!disputes_raised_by_fkey(name)`
    )
    .order("created_at", { ascending: false });

  if (filterStatus && filterStatus !== "all") {
    query = query.eq("status", filterStatus);
  }

  const { data: disputes } = await query;

  const STATUSES = ["all", "open", "investigating", "resolved", "closed"];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/disputes${s === "all" ? "" : `?status=${s}`}`}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              (filterStatus ?? "all") === s
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th className="p-3 font-medium">ID</th>
              <th className="p-3 font-medium">Booking</th>
              <th className="p-3 font-medium">Raised By</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(disputes ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  No disputes found.
                </td>
              </tr>
            )}
            {(disputes ?? []).map((d) => {
              const booking = Array.isArray(d.booking) ? d.booking[0] : d.booking;
              const raisedBy = Array.isArray(d.raised_by_profile)
                ? d.raised_by_profile[0]
                : d.raised_by_profile;
              return (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs text-gray-500">
                    {String(d.id).slice(0, 8)}
                  </td>
                  <td className="p-3">
                    <span className="text-xs text-gray-600">
                      {booking?.area ?? "—"}
                      {booking?.scheduled_at && (
                        <>
                          {" · "}
                          {new Date(booking.scheduled_at).toLocaleDateString()}
                        </>
                      )}
                    </span>
                  </td>
                  <td className="p-3">{raisedBy?.name ?? "—"}</td>
                  <td className="p-3 capitalize">{d.category ?? "—"}</td>
                  <td className="p-3">
                    <span
                      className={`status-badge ${statusColor[d.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/disputes/${d.id}`}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Manage
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
