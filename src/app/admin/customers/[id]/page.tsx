import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Real booking_status enum values (no pending/confirmed).
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

export default async function AdminCustomerDetailPage({
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

  const { data: customer } = await supabase
    .from("profiles")
    .select("id, name, phone, created_at, role")
    .eq("id", id)
    .eq("role", "customer")
    .single();

  if (!customer) notFound();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, status, area, scheduled_at, hours, total_amount, cleaner:profiles!bookings_cleaner_id_fkey(name)"
    )
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  const totalSpent = (bookings ?? [])
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0);

  // Two-way reviews: this customer's rating + the reviews cleaners left.
  const { data: ratingData } = await supabase.rpc("get_customer_rating", {
    p_customer: id,
  });
  const rating = (Array.isArray(ratingData) ? ratingData[0] : ratingData) as
    | { avg_rating: number | null; review_count: number }
    | null;
  const { data: customerReviews } = await supabase
    .from("customer_reviews")
    .select("id, rating, comment, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .returns<
      { id: string; rating: number; comment: string | null; created_at: string }[]
    >();

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/customers" className="text-sm text-blue-600 hover:underline">
          ← Customers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Customer Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="card p-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-gray-500">Name</p>
          <p className="font-semibold text-gray-900">{customer.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Phone</p>
          <p className="font-medium">{customer.phone ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Joined</p>
          <p className="font-medium">
            {new Date(customer.created_at).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Bookings</p>
          <p className="font-semibold text-gray-900">{(bookings ?? []).length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Spent (completed)</p>
          <p className="font-semibold text-gray-900">${totalSpent.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Rating (from cleaners)</p>
          <p className="font-semibold text-gray-900">
            {rating?.avg_rating != null
              ? `★ ${rating.avg_rating} (${rating.review_count})`
              : "—"}
          </p>
        </div>
      </div>

      {/* Reviews from cleaners */}
      {(customerReviews ?? []).length > 0 && (
        <div className="card p-6">
          <h2 className="mb-4 font-semibold text-gray-900">Reviews from cleaners</h2>
          <ul className="divide-y divide-gray-100">
            {(customerReviews ?? []).map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{r.rating}/5</span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-1 text-sm text-gray-600">{r.comment}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

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
                  <th className="pb-2 pr-4 font-medium">Cleaner</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Area</th>
                  <th className="pb-2 pr-4 font-medium">Scheduled</th>
                  <th className="pb-2 pr-4 font-medium">Total</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(bookings ?? []).map((b) => {
                  const cleaner = Array.isArray(b.cleaner) ? b.cleaner[0] : b.cleaner;
                  return (
                    <tr key={b.id}>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-500">
                        {String(b.id).slice(0, 8)}
                      </td>
                      <td className="py-2 pr-4">{cleaner?.name ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`status-badge ${statusColor[b.status] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{b.area ?? "—"}</td>
                      <td className="py-2 pr-4 text-xs">
                        {b.scheduled_at
                          ? new Date(b.scheduled_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="py-2 pr-4">
                        {b.total_amount != null
                          ? `$${Number(b.total_amount).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="py-2">
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
        )}
      </div>
    </main>
  );
}
