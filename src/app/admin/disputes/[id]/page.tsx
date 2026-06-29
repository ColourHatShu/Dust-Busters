import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateDisputeStatus, issueRefund } from "./actions";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileWarning,
  Info,
  RotateCcw,
  User,
} from "lucide-react";

const DISPUTE_STATUSES = ["open", "investigating", "resolved", "closed"];

const disputeBadgeClass: Record<string, string> = {
  open: "badge badge-warning",
  investigating: "badge badge-info",
  resolved: "badge badge-success",
  closed: "badge badge-neutral",
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
    .select("id, type, amount, status, stripe_payment_intent_id")
    .eq("booking_id", dispute.booking_id)
    .eq("status", "paid")
    .neq("type", "refund");

  const initial = (name?: string | null) =>
    name?.trim()?.charAt(0).toUpperCase() || "?";

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <Link
          href="/admin/disputes"
          className="link-subtle inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Disputes
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="icon-tile">
            <FileWarning className="h-5 w-5" />
          </span>
          <div>
            <h1 className="page-title">Dispute Detail</h1>
            <p className="page-subtitle">Investigate and resolve this case</p>
          </div>
        </div>
      </div>

      {/* Dispute Summary */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`${disputeBadgeClass[dispute.status] ?? "badge badge-neutral"} capitalize`}
          >
            {dispute.status}
          </span>
          <span className="text-sm font-medium capitalize text-slate-700">
            {dispute.category ?? "—"}
          </span>
          <span className="ml-auto text-xs text-slate-400">
            {new Date(dispute.created_at).toLocaleString()}
          </span>
        </div>
        <hr className="hr-soft" />
        <div>
          <p className="eyebrow-label mb-1.5">Description</p>
          <p className="text-sm leading-relaxed text-slate-700">
            {dispute.description ?? "No description provided."}
          </p>
        </div>
        {dispute.resolution && (
          <div className="surface-muted p-4">
            <p className="eyebrow-label mb-1.5">Resolution</p>
            <p className="text-sm leading-relaxed text-slate-700">
              {dispute.resolution}
            </p>
          </div>
        )}
      </div>

      {/* People */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card card-sm">
          <p className="eyebrow-label mb-3">Raised By</p>
          {raisedBy ? (
            <div className="flex items-center gap-3">
              <span className="avatar h-10 w-10 text-sm">
                {initial(raisedBy.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">
                  {raisedBy.name ?? "—"}
                </p>
                <p className="text-sm text-slate-500">{raisedBy.phone ?? "—"}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">—</p>
          )}
        </div>
        <div className="card card-sm">
          <p className="eyebrow-label mb-3">Customer</p>
          {customer ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="avatar h-10 w-10 text-sm">
                  {initial(customer.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {customer.name ?? "—"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {customer.phone ?? "—"}
                  </p>
                </div>
              </div>
              <Link
                href={`/admin/customers/${customer.id}`}
                className="link-accent text-xs"
              >
                View profile
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-slate-400">
              <span className="icon-tile icon-tile-neutral icon-tile-sm">
                <User className="h-4 w-4" />
              </span>
              <p className="text-sm">—</p>
            </div>
          )}
        </div>
        <div className="card card-sm">
          <p className="eyebrow-label mb-3">Cleaner</p>
          {cleaner ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="avatar h-10 w-10 text-sm">
                  {initial(cleaner.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {cleaner.name ?? "—"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {cleaner.phone ?? "—"}
                  </p>
                </div>
              </div>
              <Link
                href={`/admin/cleaners/${cleaner.id}`}
                className="link-accent text-xs"
              >
                View profile
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-slate-400">
              <span className="icon-tile icon-tile-neutral icon-tile-sm">
                <User className="h-4 w-4" />
              </span>
              <p className="text-sm">—</p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Info */}
      {booking && (
        <div className="card">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="icon-tile icon-tile-soft">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <p className="eyebrow-label">Booking</p>
                <p className="font-medium text-slate-900">
                  {booking.area ?? "—"}
                  {booking.scheduled_at && (
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      · {new Date(booking.scheduled_at).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Link
              href={`/admin/bookings/${booking.id}`}
              className="link-accent inline-flex items-center gap-1 whitespace-nowrap text-sm"
            >
              View booking <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="detail-row mt-4 border-t border-slate-100 pt-4">
            <span className="detail-label">Total</span>
            <span className="detail-value">
              ${Number(booking.total_amount ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Resolution Form */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-soft">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <h2 className="section-title">Update Resolution</h2>
        </div>
        <form action={updateDisputeStatus} className="space-y-4">
          <input type="hidden" name="dispute_id" value={dispute.id} />
          <div className="space-y-1.5">
            <label htmlFor="status" className="form-label">
              Status
            </label>
            <select
              id="status"
              name="status"
              className="input-modern"
              defaultValue={dispute.status}
            >
              {DISPUTE_STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="resolution" className="form-label">
              Resolution Notes
            </label>
            <textarea
              id="resolution"
              name="resolution"
              rows={3}
              defaultValue={dispute.resolution ?? ""}
              placeholder="Describe the resolution…"
              className="input-modern resize-none"
            />
          </div>
          <button type="submit" className="btn-base btn-primary">
            Save Resolution
          </button>
        </form>
      </div>

      {/* Issue Refund */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-danger">
            <RotateCcw className="h-5 w-5" />
          </span>
          <h2 className="section-title">Issue Refund</h2>
        </div>
        {(payments ?? []).length === 0 ? (
          <div className="alert alert-info">
            <Info className="h-5 w-5" />
            <span>No paid payments available to refund.</span>
          </div>
        ) : (
          <form action={issueRefund} className="space-y-4">
            <input type="hidden" name="dispute_id" value={dispute.id} />
            <input type="hidden" name="booking_id" value={dispute.booking_id} />
            <div className="space-y-1.5">
              <label htmlFor="payment_id" className="form-label">
                Payment to Refund
              </label>
              <select id="payment_id" name="payment_id" required className="input-modern">
                {(payments ?? [])
                  .filter((p) => p.type !== "refund")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.type} — ${Number(p.amount).toFixed(2)} ({p.status})
                    </option>
                  ))}
              </select>
              {/* The action refunds the SELECTED payment's intent and validates
                  the amount against it server-side. */}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="amount" className="form-label">
                Refund Amount ($)
              </label>
              <input
                id="amount"
                type="number"
                name="amount"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                className="input-modern"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="reason" className="form-label">
                Reason
              </label>
              <input
                id="reason"
                type="text"
                name="reason"
                required
                placeholder="Reason for refund"
                className="input-modern"
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
