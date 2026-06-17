import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateDisputeStatus, issueRefund } from "./actions";

const DISPUTE_STATUSES = ["open", "investigating", "resolved", "closed"];

const statusColor: Record<string, string> = {
  open: "bg-red-100 text-red-800",
  investigating: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-700",
};

export default async function AdminDisputeDetailPage({
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

  const { data: dispute } = await supabase
    .from("disputes")
    .select(
      `id, category, status, description, resolution, created_at, resolved_at,
       booking_id, raised_by,
       booking:bookings(id, area, scheduled_at, total_amount, customer_id, cleaner_id,
         customer:profiles!bookings_customer_id_fkey(id, name, phone),
         cleaner:profiles!bookings_cleaner_id_fkey(id, name, phone)
       ),
       raised_by_profile:profiles!disputes_raised_by_fkey(id, name, phone)`
    )
    .eq("id", id)
    .single();

  if (!dispute) notFound();

  const booking = Array.isArray(dispute.booking) ? dispute.booking[0] : dispute.booking;
  const raisedBy = Array.isArray(dispute.raised_by_profile)
    ? dispute.raised_by_profile[0]
    : dispute.raised_by_profile;
  const customer = booking
    ? Array.isArray(booking.customer) ? booking.customer[0] : booking.customer
    : null;
  const cleaner = booking
    ? Array.isArray(booking.cleaner) ? booking.cleaner[0] : booking.cleaner
    : null;

  // Payments for this booking (for refund selection)
  const { data: payments } = await supabase
    .from("payments")
    .select("id, payment_type, amount, status, stripe_payment_intent_id")
    .eq("booking_id", dispute.booking_id)
    .eq("status", "paid")
    .neq("payment_type", "refund");

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/disputes" className="text-sm text-blue-600 hover:underline">
          ← Disputes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Dispute Detail</h1>
      </div>

      {/* Dispute Summary */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className={`status-badge ${statusColor[dispute.status] ?? "bg-gray-100 text-gray-700"}`}>
            {dispute.status}
          </span>
          <span className="text-sm font-medium text-gray-700 capitalize">
            {dispute.category ?? "—"}
          </span>
          <span className="text-xs text-gray-400 ml-auto">
            {new Date(dispute.created_at).toLocaleString()}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Description</p>
          <p className="text-sm text-gray-800 leading-relaxed">
            {dispute.description ?? "No description provided."}
          </p>
        </div>
        {dispute.resolution && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Resolution</p>
            <p className="text-sm text-gray-800">{dispute.resolution}</p>
          </div>
        )}
      </div>

      {/* People */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Raised By</h3>
          <p className="font-medium">{raisedBy?.name ?? "—"}</p>
          <p className="text-sm text-gray-500">{raisedBy?.phone ?? "—"}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Customer</h3>
          {customer ? (
            <>
              <p className="font-medium">{customer.name ?? "—"}</p>
              <p className="text-sm text-gray-500">{customer.phone ?? "—"}</p>
              <Link href={`/admin/customers/${customer.id}`} className="text-xs text-blue-600 hover:underline">
                View profile
              </Link>
            </>
          ) : <p className="text-sm text-gray-400">—</p>}
        </div>
        <div className="card p-4">
          <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Cleaner</h3>
          {cleaner ? (
            <>
              <p className="font-medium">{cleaner.name ?? "—"}</p>
              <p className="text-sm text-gray-500">{cleaner.phone ?? "—"}</p>
              <Link href={`/admin/cleaners/${cleaner.id}`} className="text-xs text-blue-600 hover:underline">
                View profile
              </Link>
            </>
          ) : <p className="text-sm text-gray-400">—</p>}
        </div>
      </div>

      {/* Booking Info */}
      {booking && (
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Booking</p>
            <p className="font-medium">
              {booking.area ?? "—"}
              {booking.scheduled_at && (
                <span className="text-gray-500 font-normal ml-2 text-sm">
                  · {new Date(booking.scheduled_at).toLocaleString()}
                </span>
              )}
            </p>
            <p className="text-sm text-gray-600">
              Total: ${Number(booking.total_amount ?? 0).toFixed(2)}
            </p>
          </div>
          <Link
            href={`/admin/bookings/${booking.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            View booking →
          </Link>
        </div>
      )}

      {/* Resolution Form */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Update Resolution</h2>
        <form action={updateDisputeStatus} className="space-y-3">
          <input type="hidden" name="dispute_id" value={dispute.id} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="status" className="input-modern w-full" defaultValue={dispute.status}>
              {DISPUTE_STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resolution Notes
            </label>
            <textarea
              name="resolution"
              rows={3}
              defaultValue={dispute.resolution ?? ""}
              placeholder="Describe the resolution…"
              className="input-modern w-full resize-none"
            />
          </div>
          <button type="submit" className="btn-base btn-primary">
            Save Resolution
          </button>
        </form>
      </div>

      {/* Issue Refund */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Issue Refund</h2>
        {(payments ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">No paid payments available to refund.</p>
        ) : (
          <form action={issueRefund} className="space-y-3">
            <input type="hidden" name="dispute_id" value={dispute.id} />
            <input type="hidden" name="booking_id" value={dispute.booking_id} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment to Refund
              </label>
              <select name="payment_id" className="input-modern w-full" onChange={() => {}}>
                {(payments ?? []).map((p) => (
                  <option key={p.id} value={p.id} data-intent={p.stripe_payment_intent_id ?? "none"}>
                    {p.payment_type} — ${Number(p.amount).toFixed(2)} ({p.status})
                  </option>
                ))}
              </select>
              {/* Hidden field — JS-free: pre-fill with first payment's intent */}
              <input
                type="hidden"
                name="stripe_payment_intent_id"
                value={payments?.[0]?.stripe_payment_intent_id ?? "none"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Refund Amount ($)
              </label>
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0.01"
                max={Number(payments?.[0]?.amount ?? 0)}
                required
                placeholder="0.00"
                className="input-modern w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <input
                type="text"
                name="reason"
                required
                placeholder="Reason for refund"
                className="input-modern w-full"
              />
            </div>
            <button
              type="submit"
              className="btn-base bg-red-600 text-white hover:bg-red-700"
            >
              Issue Refund
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
