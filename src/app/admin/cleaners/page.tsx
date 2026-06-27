import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setCleanerVerified, setCleanerActive } from "./actions";
import AdminSearch from "../AdminSearch";

export default async function AdminCleanersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
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

  let cleanersQuery = supabase
    .from("profiles")
    .select("id, name, phone, cleaner_details(id_verified, active, areas_served)")
    .eq("role", "cleaner");
  if (q) {
    cleanersQuery = cleanersQuery.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data: cleaners } = await cleanersQuery;

  // Aggregate booking stats per cleaner
  const { data: bookings } = await supabase
    .from("bookings")
    .select("cleaner_id, status");

  // Aggregate ratings per cleaner
  const { data: reviews } = await supabase
    .from("reviews")
    .select("cleaner_id, rating");

  // Aggregate offers (accepted vs total) per cleaner.
  // Real table is `booking_offers` with column `state` (not `offers`/`status`).
  const { data: offers } = await supabase
    .from("booking_offers")
    .select("cleaner_id, state");

  type CleanerStats = {
    completed: number;
    cancelled: number;
    total: number;
    totalRating: number;
    reviewCount: number;
    offersTotal: number;
    offersAccepted: number;
  };

  const statsMap: Record<string, CleanerStats> = {};

  for (const b of bookings ?? []) {
    if (!b.cleaner_id) continue;
    if (!statsMap[b.cleaner_id])
      statsMap[b.cleaner_id] = {
        completed: 0, cancelled: 0, total: 0,
        totalRating: 0, reviewCount: 0,
        offersTotal: 0, offersAccepted: 0,
      };
    statsMap[b.cleaner_id].total += 1;
    if (b.status === "completed") statsMap[b.cleaner_id].completed += 1;
    if (b.status === "cancelled") statsMap[b.cleaner_id].cancelled += 1;
  }

  for (const r of reviews ?? []) {
    if (!r.cleaner_id) continue;
    if (!statsMap[r.cleaner_id])
      statsMap[r.cleaner_id] = {
        completed: 0, cancelled: 0, total: 0,
        totalRating: 0, reviewCount: 0,
        offersTotal: 0, offersAccepted: 0,
      };
    statsMap[r.cleaner_id].totalRating += Number(r.rating);
    statsMap[r.cleaner_id].reviewCount += 1;
  }

  for (const o of offers ?? []) {
    if (!o.cleaner_id) continue;
    if (!statsMap[o.cleaner_id])
      statsMap[o.cleaner_id] = {
        completed: 0, cancelled: 0, total: 0,
        totalRating: 0, reviewCount: 0,
        offersTotal: 0, offersAccepted: 0,
      };
    statsMap[o.cleaner_id].offersTotal += 1;
    if (o.state === "accepted") statsMap[o.cleaner_id].offersAccepted += 1;
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Cleaners</h1>
      </div>
      <AdminSearch placeholder="Search cleaners by name or phone" defaultValue={q} />
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Areas</th>
              <th className="p-3 font-medium">Verified</th>
              <th className="p-3 font-medium">Active</th>
              <th className="p-3 font-medium">Jobs Done</th>
              <th className="p-3 font-medium">Avg Rating</th>
              <th className="p-3 font-medium">Cancel Rate</th>
              <th className="p-3 font-medium">Accept Rate</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(cleaners ?? []).map((c) => {
              const d = Array.isArray(c.cleaner_details)
                ? c.cleaner_details[0]
                : c.cleaner_details;
              const verified = d?.id_verified ?? false;
              const active = d?.active ?? false;
              const stats = statsMap[c.id] ?? {
                completed: 0, cancelled: 0, total: 0,
                totalRating: 0, reviewCount: 0,
                offersTotal: 0, offersAccepted: 0,
              };
              const avgRating = stats.reviewCount > 0
                ? (stats.totalRating / stats.reviewCount).toFixed(1)
                : "—";
              const cancelRate = stats.total > 0
                ? `${Math.round((stats.cancelled / stats.total) * 100)}%`
                : "—";
              const acceptRate = stats.offersTotal > 0
                ? `${Math.round((stats.offersAccepted / stats.offersTotal) * 100)}%`
                : "—";

              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <Link
                      href={`/admin/cleaners/${c.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {c.name ?? "(no name)"}
                    </Link>
                  </td>
                  <td className="p-3 text-xs text-gray-600">
                    {(d?.areas_served ?? []).join(", ") || "—"}
                  </td>
                  <td className="p-3">
                    {verified ? (
                      <span className="status-badge bg-green-100 text-green-800">Verified</span>
                    ) : (
                      <span className="status-badge bg-gray-100 text-gray-500">Unverified</span>
                    )}
                  </td>
                  <td className="p-3">
                    {active ? (
                      <span className="status-badge bg-blue-100 text-blue-800">Active</span>
                    ) : (
                      <span className="status-badge bg-red-100 text-red-700">Inactive</span>
                    )}
                  </td>
                  <td className="p-3">{stats.completed}</td>
                  <td className="p-3">{avgRating}</td>
                  <td className="p-3">{cancelRate}</td>
                  <td className="p-3">{acceptRate}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <form
                        action={async () => {
                          "use server";
                          await setCleanerVerified(c.id, !verified);
                        }}
                      >
                        <button className="btn-base btn-secondary text-xs py-1 px-2">
                          {verified ? "Unverify" : "Verify"}
                        </button>
                      </form>
                      <form
                        action={async () => {
                          "use server";
                          await setCleanerActive(c.id, !active);
                        }}
                      >
                        <button
                          className={`btn-base text-xs py-1 px-2 ${
                            active
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                        >
                          {active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </div>
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
