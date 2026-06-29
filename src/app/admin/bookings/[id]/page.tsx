import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Hash,
  CircleDot,
  MapPin,
  CalendarClock,
  Clock,
  DollarSign,
  User,
  Sparkles,
  Phone,
  Star,
  AlertTriangle,
  ShieldCheck,
  Pencil,
  Ban,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bookingBadgeClass, bookingStatusLabel, paymentBadgeClass } from "@/lib/status";
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
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <Link
          href="/admin/bookings"
          className="link-subtle mb-4 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Bookings
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="page-title">Booking Detail</h1>
          <span className={bookingBadgeClass(booking.status)}>
            {bookingStatusLabel(booking.status)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Info */}
          <div className="card">
            <h2 className="section-title mb-2">Summary</h2>
            <div className="detail-row">
              <span className="detail-label">
                <Hash className="h-4 w-4" aria-hidden="true" />
                Booking ID
              </span>
              <span className="detail-value font-mono">{booking.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">
                <CircleDot className="h-4 w-4" aria-hidden="true" />
                Status
              </span>
              <span className={bookingBadgeClass(booking.status)}>
                {bookingStatusLabel(booking.status)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Area
              </span>
              <span className="detail-value">{booking.area ?? "—"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                Scheduled
              </span>
              <span className="detail-value">
                {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : "—"}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Hours
              </span>
              <span className="detail-value">{booking.hours ?? "—"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">
                <DollarSign className="h-4 w-4" aria-hidden="true" />
                Total
              </span>
              <span className="detail-value">${Number(booking.total_amount ?? 0).toFixed(2)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Deposit</span>
              <span className="detail-value">${Number(booking.deposit_amount ?? 0).toFixed(2)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Balance</span>
              <span className="detail-value">${Number(booking.balance_amount ?? 0).toFixed(2)}</span>
            </div>
            {addressRow?.full_address && (
              <div className="detail-row">
                <span className="detail-label">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Address
                </span>
                <span className="detail-value">{addressRow.full_address}</span>
              </div>
            )}
            {booking.cancellation_reason && (
              <div className="alert alert-error mt-4">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <div>
                  <p className="font-semibold">
                    Cancelled by {booking.cancelled_by ?? "unknown"}
                  </p>
                  <p>{booking.cancellation_reason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Offers */}
          {offers && offers.length > 0 && (
            <section className="card card-flush overflow-hidden">
              <h2 className="section-title px-5 pt-5 pb-3">Offers ({offers.length})</h2>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cleaner</th>
                      <th>State</th>
                      <th>Sent</th>
                      <th>Responded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((o) => {
                      const offerCleaner = Array.isArray(o.cleaner) ? o.cleaner[0] : o.cleaner;
                      return (
                        <tr key={o.id}>
                          <td className="font-medium text-slate-700">{offerCleaner?.name ?? "—"}</td>
                          <td>
                            <span
                              className={`badge ${
                                o.state === "accepted"
                                  ? "badge-success"
                                  : o.state === "declined"
                                    ? "badge-danger"
                                    : "badge-neutral"
                              }`}
                            >
                              {o.state}
                            </span>
                          </td>
                          <td className="whitespace-nowrap text-slate-500">
                            {new Date(o.created_at).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap text-slate-500">
                            {o.responded_at ? new Date(o.responded_at).toLocaleString() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Payments */}
          {payments && payments.length > 0 && (
            <section className="card card-flush overflow-hidden">
              <h2 className="section-title px-5 pt-5 pb-3">Payments</h2>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th className="num">Amount</th>
                      <th>Status</th>
                      <th>Paid At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="capitalize">{p.type}</td>
                        <td className="num font-medium text-slate-700">
                          ${Number(p.amount).toFixed(2)}
                        </td>
                        <td>
                          <span className={paymentBadgeClass(p.status)}>{p.status}</span>
                        </td>
                        <td className="whitespace-nowrap text-slate-500">
                          {p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Reviews */}
          {reviews && reviews.length > 0 && (
            <div className="card">
              <h2 className="section-title mb-4">Reviews</h2>
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <span className="icon-tile icon-tile-warn icon-tile-sm">
                      <Star className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{r.rating}/5</span>
                        <span className="text-xs text-slate-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {r.comment && <p className="mt-1 text-sm text-slate-600">{r.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          {/* People */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="card card-sm">
              <div className="mb-3 flex items-center gap-3">
                <span className="icon-tile icon-tile-soft icon-tile-sm">
                  <User className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="section-title">Customer</h3>
              </div>
              {customer ? (
                <>
                  <p className="font-medium text-slate-900">{customer.name ?? "—"}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    {customer.phone ?? "—"}
                  </p>
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="link-accent mt-2 inline-block text-xs font-medium"
                  >
                    View profile
                  </Link>
                </>
              ) : (
                <p className="text-sm text-slate-400">No customer assigned</p>
              )}
            </div>
            <div className="card card-sm">
              <div className="mb-3 flex items-center gap-3">
                <span className="icon-tile icon-tile-info icon-tile-sm">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="section-title">Cleaner</h3>
              </div>
              {cleaner ? (
                <>
                  <p className="font-medium text-slate-900">{cleaner.name ?? "—"}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    {cleaner.phone ?? "—"}
                  </p>
                  <Link
                    href={`/admin/cleaners/${cleaner.id}`}
                    className="link-accent mt-2 inline-block text-xs font-medium"
                  >
                    View profile
                  </Link>
                </>
              ) : (
                <p className="text-sm text-slate-400">No cleaner assigned yet</p>
              )}
            </div>
          </div>

          {/* Disputes */}
          {disputes && disputes.length > 0 && (
            <div className="card">
              <h2 className="section-title mb-4">Disputes</h2>
              <div className="space-y-3">
                {disputes.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge badge-danger">{d.status}</span>
                        <span className="text-sm font-medium capitalize text-slate-800">
                          {d.category.replace(/_/g, " ")}
                        </span>
                      </div>
                      {d.description && <p className="mt-1 text-sm text-slate-600">{d.description}</p>}
                    </div>
                    <Link
                      href={`/admin/disputes/${d.id}`}
                      className="link-accent inline-flex shrink-0 items-center gap-1 text-xs font-medium"
                    >
                      Manage
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Actions */}
          <div className="card space-y-6">
            <div className="flex items-center gap-3">
              <span className="icon-tile icon-tile-sm">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 className="section-title">Admin Actions</h2>
            </div>

            <div>
              <h3 className="form-label mb-2">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Override Status
              </h3>
              <form action={updateBookingStatus} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="booking_id" value={booking.id} />
                <select name="new_status" className="input-modern w-auto" defaultValue={booking.status}>
                  {BOOKING_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <button type="submit" className="btn-base btn-primary">Update Status</button>
              </form>
            </div>

            {booking.status !== "cancelled" && (
              <>
                <hr className="hr-soft" />
                <div>
                  <h3 className="form-label mb-2">
                    <Ban className="h-4 w-4" aria-hidden="true" />
                    Cancel Booking
                  </h3>
                  <form action={adminCancelBooking} className="space-y-2">
                    <input type="hidden" name="booking_id" value={booking.id} />
                    <input name="reason" placeholder="Cancellation reason (required)" required className="input-modern w-full" />
                    <button
                      type="submit"
                      className="btn-base bg-red-600 text-white hover:bg-red-700"
                    >
                      Cancel Booking
                    </button>
                  </form>
                </div>
              </>
            )}

            <hr className="hr-soft" />
            <div>
              <h3 className="form-label mb-2">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Reassign Cleaner
              </h3>
              {eligibleCleaners.length === 0 ? (
                <p className="form-hint">No eligible cleaners in {booking.area}.</p>
              ) : (
                <form action={reassignCleaner} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="booking_id" value={booking.id} />
                  <select name="cleaner_id" className="input-modern w-auto" required>
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
        </aside>
      </div>
    </main>
  );
}
