import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setCleanerVerified, setCleanerActive } from "../actions";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default async function AdminCleanerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: cleaner } = await supabase
    .from("profiles")
    .select(
      "id, name, phone, created_at, cleaner_details(id_verified, active, areas_served, verified_at)"
    )
    .eq("id", id)
    .eq("role", "cleaner")
    .single();

  if (!cleaner) notFound();

  const d = Array.isArray(cleaner.cleaner_details)
    ? cleaner.cleaner_details[0]
    : cleaner.cleaner_details;

  // Bookings for this cleaner
  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, status, area, scheduled_at, hours, total_amount, customer:profiles!bookings_customer_id_fkey(name)"
    )
    .eq("cleaner_id", id)
    .order("created_at", { ascending: false });

  // Reviews for this cleaner
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_by, created_at, booking_id")
    .eq("cleaner_id", id)
    .order("created_at", { ascending: false });

  // Offers for acceptance rate
  const { data: offers } = await supabase
    .from("offers")
    .select("id, status")
    .eq("cleaner_id", id);

  // Compute metrics
  const totalJobs = (bookings ?? []).length;
  const completed = (bookings ?? []).filter((b) => b.status === "completed").length;
  const cancelled = (bookings ?? []).filter((b) => b.status === "cancelled").length;
  const cancelRate = totalJobs > 0 ? Math.round((cancelled / totalJobs) * 100) : 0;

  const totalOffers = (offers ?? []).length;
  const acceptedOffers = (offers ?? []).filter((o) => o.status === "accepted").length;
  const acceptRate = totalOffers > 0 ? Math.round((acceptedOffers / totalOffers) * 100) : 0;

  const totalRating = (reviews ?? []).reduce((sum, r) => sum + Number(r.rating), 0);
  const avgRating =
    (reviews ?? []).length > 0
      ? (totalRating / (reviews ?? []).length).toFixed(1)
      : null;

  const verified = d?.id_verified ?? false;
  const active = d?.active ?? false;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/cleaners" className="text-sm text-blue-600 hover:underline">
          ← Cleaners
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Cleaner Profile</h1>
      </div>

      {/* Profile + Actions */}
      <div className="card p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500">Name</p>
            <p className="text-xl font-semibold text-gray-900">{cleaner.name ?? "—"}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="font-medium">{cleaner.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Joined</p>
              <p className="font-medium">{new Date(cleaner.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Areas Served</p>
              <p className="font-medium">{(d?.areas_served ?? []).join(", ") || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Verified At</p>
              <p className="font-medium">
                {d?.verified_at ? new Date(d.verified_at).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {verified ? (
              <span className="status-badge bg-green-100 text-green-800">Verified</span>
            ) : (
              <span className="status-badge bg-gray-100 text-gray-500">Unverified</span>
            )}
            {active ? (
              <span className="status-badge bg-blue-100 text-blue-800">Active</span>
            ) : (
              <span className="status-badge bg-red-100 text-red-700">Inactive</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <form
            action={async () => {
              "use server";
              await setCleanerVerified(id, !verified);
            }}
          >
            <button className="btn-base btn-secondary w-full">
              {verified ? "Unverify" : "Verify"}
            </button>
          </form>
          <form
            action={async () => {
              "use server";
              await setCleanerActive(id, !active);
            }}
          >
            <button
              className={`btn-base w-full ${
                active
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              {active ? "Deactivate" : "Activate"}
            </button>
          </form>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{completed}</p>
          <p className="text-xs text-gray-500 mt-1">Jobs Completed</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{avgRating ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-1">Avg Rating</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{cancelRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Cancel Rate</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{acceptRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Acceptance Rate</p>
        </div>
      </div>

      {/* Booking History */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Booking History</h2>
        {(bookings ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4 font-medium">ID</th>
                  <th className="pb-2 pr-4 font-medium">Customer</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Area</th>
                  <th className="pb-2 pr-4 font-medium">Scheduled</th>
                  <th className="pb-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(bookings ?? []).map((b) => {
                  const customer = Array.isArray(b.customer) ? b.customer[0] : b.customer;
                  return (
                    <tr key={b.id}>
                      <td className="py-2 pr-4">
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          className="font-mono text-xs text-blue-600 hover:underline"
                        >
                          {String(b.id).slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{customer?.name ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`status-badge ${statusColor[b.status] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{b.area ?? "—"}</td>
                      <td className="py-2 pr-4 text-xs text-gray-500">
                        {b.scheduled_at
                          ? new Date(b.scheduled_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="py-2">
                        {b.total_amount != null
                          ? `$${Number(b.total_amount).toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          Reviews ({(reviews ?? []).length})
        </h2>
        {(reviews ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {(reviews ?? []).map((r) => (
              <div key={r.id} className="border-b pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{r.rating}/5</span>
                  <span className="text-xs text-gray-400">
                    by {r.created_by} · {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/admin/bookings/${r.booking_id}`}
                    className="text-xs text-blue-600 hover:underline ml-auto"
                  >
                    Booking
                  </Link>
                </div>
                {r.comment && (
                  <p className="text-sm text-gray-700">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
