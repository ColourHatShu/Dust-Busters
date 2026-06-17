import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateBookingStatus, adminCancelBooking, reassignCleaner } from "./actions";

const BOOKING_STATUSES = [
  "broadcasting",
  "accepted",
  "deposit_paid",
  "in_progress",
  "completed",
  "disputed",
  "balance_paid",
  "closed",
  "cancelled",
  "no_cleaner_found",
];

const statusColor: Record<string, string> = {
  broadcasting: "bg-blue-100 text-blue-800",
  accepted: "bg-yellow-100 text-yellow-800",
  deposit_paid: "bg-green-100 text-green-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  completed: "bg-orange-100 text-orange-800",
  disputed: "bg-red-100 text-red-800",
  balance_paid: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-800",
  no_cleaner_found: "bg-red-100 text-red-800",
};

export default async function AdminBookingDetailPage({
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

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `id, status, area, scheduled_at, hours, total_amount, deposit_amount, balance_amount,
       cancellation_reason, cancelled_by, created_at,
       customer_id, cleaner_id,
       customer:profiles!bookings_customer_id_fkey(id, name, phone),
       cleaner:profiles!bookings_cleaner_id_fkey(id, name, phone)`
    )
    .eq("id", id)
    .single();

  if (!booking) notFound();

  // Address (separate privacy table — admin can always see it via service role implicit in RLS)
  const { data: addressRow } = await supabase
    .from("booking_addresses")
    .select("full_address")
    .eq("booking_id", id)
    .maybeSingle();

  // Offers — correct table is booking_offers, correct column is `state` not `status`
  const { data: offers } = await supabase
    .from("booking_offers")
    .select("id, cleaner_id, state, created_at, responded_at, cleaner:profiles!booking_offers_cleaner_id_fkey(name)")
    .eq("booking_id", id)
    .order("created_at", { ascending: false });

  // Payments — correct column is `type` not `payment_type`
  const { data: payments } = await supabase
    .from("payments")
    .select("id, type, amount, status, paid_at, stripe_payment_intent_id")
    .eq("booking_id", id)
    .order("created_at", { ascending: false });

  // Reviews — no `created_by` column exists
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at")
    .eq("booking_id", id);

  // Disputes
  const { data: disputes } = await supabase
    .from("disputes")
    .select("id, category, status, description, created_at")
    .eq("booking_id", id);

  // Available cleaners for reassignment (active, verified, same area)
  const { data: availableCleaners } = await supabase
    .from("profiles")
    .select("id, name, cleaner_details!inner(active, id_verified, areas_served)")
    .eq("role", "cleaner")
    .neq("id", booking.cleaner_id ?? "");

  const eligibleCleaners = (availableCleaners ?? []).filter((c) => {
    const d = Array.isArray(c.cleaner_details) ? c.cleaner_details[0] : c.cleaner_details;
    return d?.active === true && d?.id_verified === true && (d?.areas_served ?? []).includes(booking.area);
  });

  const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
  const cleaner = Array.isArray(booking.cleaner) ? booking.cleaner[0] : booking.cleaner;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/bookings" className="text-sm text-blue-600 hover:underline">← Bookings</Link>
        <h1 className="text-2xl font-bold text-gray-900">Booking Detail</h1>
      </div>

      {/* Booking Info */}
      <div className="card p-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-gray-500">Booking ID</p>
          <p className="font-mono text-sm">{booking.id}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Status</p>
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[booking.status] ?? "bg-gray-100 text-gray-700"}`}>
            {booking.status.replace(/_/g, " ")}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500">Area</p>
          <p className="font-medium">{booking.area ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Scheduled</p>
          <p className="font-medium">
            {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Hours</p>
          <p className="font-medium">{booking.hours ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total / Deposit / Balance</p>
          <p className="font-medium">
            ${Number(booking.total_amount ?? 0).toFixed(2)} / ${Number(booking.deposit_amount ?? 0).toFixed(2)} / ${Number(booking.balance_amount ?? 0).toFixed(2)}
          </p>
        </div>
        {addressRow?.full_address && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-xs text-gray-500">Address</p>
            <p className="font-medium">{addressRow.full_address}</p>
          </div>
        )}
        {booking.cancellation_reason && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-xs text-gray-500">Cancellation (by: {booking.cancelled_by ?? "unknown"})</p>
            <p className="text-sm text-red-600">{booking.cancellation_reason}</p>
          </div>
        )}
      </div>

      {/* People */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <h3 className="font-semibold mb-2 text-gray-700">Customer</h3>
          {customer ? (
            <>
              <p className="font-medium">{customer.name ?? "—"}</p>
              <p className="text-sm text-gray-500">{customer.phone ?? "—"}</p>
              <Link href={`/admin/customers/${customer.id}`} className="text-xs text-blue-600 hover:underline">View profile</Link>
            </>
          ) : (
            <p className="text-sm text-gray-400">No customer assigned</p>
          )}
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-2 text-gray-700">Cleaner</h3>
          {cleaner ? (
            <>
              <p className="font-medium">{cleaner.name ?? "—"}</p>
              <p className="text-sm text-gray-500">{cleaner.phone ?? "—"}</p>
              <Link href={`/admin/cleaners/${cleaner.id}`} className="text-xs text-blue-600 hover:underline">View profile</Link>
            </>
          ) : (
            <p className="text-sm text-gray-400">No cleaner assigned yet</p>
          )}
        </div>
      </div>

      {/* Offers */}
      {offers && offers.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Offers ({offers.length})</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4 font-medium">Cleaner</th>
                <th className="pb-2 pr-4 font-medium">State</th>
                <th className="pb-2 pr-4 font-medium">Sent</th>
                <th className="pb-2 font-medium">Responded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offers.map((o) => {
                const offerCleaner = Array.isArray(o.cleaner) ? o.cleaner[0] : o.cleaner;
                return (
                  <tr key={o.id}>
                    <td className="py-2 pr-4">{offerCleaner?.name ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        o.state === "accepted" ? "bg-green-100 text-green-800"
                        : o.state === "declined" ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-700"
                      }`}>
                        {o.state}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="py-2 text-xs text-gray-500">
                      {o.responded_at ? new Date(o.responded_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments */}
      {payments && payments.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Payments</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Amount</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Paid At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-4 capitalize">{p.type}</td>
                  <td className="py-2 pr-4">${Number(p.amount).toFixed(2)}</td>
                  <td className="py-2 pr-4">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-gray-500">
                    {p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reviews */}
      {reviews && reviews.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Reviews</h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border-b pb-3 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.rating}/5 ★</span>
                  <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.comment && <p className="text-sm text-gray-700 mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disputes */}
      {disputes && disputes.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Disputes</h2>
          <div className="space-y-3">
            {disputes.map((d) => (
              <div key={d.id} className="flex items-start justify-between">
                <div>
                  <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 mr-2">
                    {d.status}
                  </span>
                  <span className="text-sm font-medium capitalize">{d.category.replace(/_/g, " ")}</span>
                  {d.description && <p className="text-sm text-gray-600 mt-1">{d.description}</p>}
                </div>
                <Link href={`/admin/disputes/${d.id}`} className="text-xs text-blue-600 hover:underline shrink-0 ml-4">
                  Manage →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Actions */}
      <div className="card p-6 space-y-6">
        <h2 className="font-semibold text-gray-900">Admin Actions</h2>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Override Status</h3>
          <form action={updateBookingStatus} className="flex gap-2 items-center">
            <input type="hidden" name="booking_id" value={booking.id} />
            <select name="new_status" className="input-modern" defaultValue={booking.status}>
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
            <button type="submit" className="btn-base btn-primary">Update Status</button>
          </form>
        </div>

        {booking.status !== "cancelled" && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Cancel Booking</h3>
            <form action={adminCancelBooking} className="space-y-2">
              <input type="hidden" name="booking_id" value={booking.id} />
              <input name="reason" placeholder="Cancellation reason (required)" required className="input-modern w-full" />
              <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                Cancel Booking
              </button>
            </form>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Reassign Cleaner</h3>
          {eligibleCleaners.length === 0 ? (
            <p className="text-sm text-gray-400">No eligible cleaners in {booking.area}.</p>
          ) : (
            <form action={reassignCleaner} className="flex gap-2 items-center">
              <input type="hidden" name="booking_id" value={booking.id} />
              <select name="cleaner_id" className="input-modern" required>
                <option value="">Select cleaner…</option>
                {eligibleCleaners.map((c) => (
                  <option key={c.id} value={c.id}>{c.name ?? c.id}</option>
                ))}
              </select>
              <button type="submit" className="btn-base btn-secondary">Reassign</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
