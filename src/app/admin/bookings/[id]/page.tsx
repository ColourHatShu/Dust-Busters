import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  MapPin,
  CalendarClock,
  Clock,
  Wallet,
  Home,
  Ban,
  User,
  Sparkles,
  Phone,
  ArrowUpRight,
  Inbox,
  CreditCard,
  Star,
  ShieldAlert,
  SlidersHorizontal,
  RefreshCw,
  XCircle,
  UserCog,
} from "lucide-react";
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

const statusPill: Record<string, string> = {
  broadcasting: "pill-info",
  accepted: "pill-warning",
  deposit_paid: "pill-success",
  in_progress: "pill-accent",
  completed: "pill-success",
  disputed: "pill-danger",
  balance_paid: "pill-success",
  closed: "pill-neutral",
  cancelled: "pill-danger",
  no_cleaner_found: "pill-danger",
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
    <main className="app-shell overflow-hidden">
      <span className="section-glow section-glow--teal absolute -top-32 left-1/4 h-72 w-72" aria-hidden="true" />
      <span className="section-glow section-glow--sky absolute top-40 -right-20 h-80 w-80" aria-hidden="true" />

      <div className="app-container relative z-10 py-10 space-y-8">
        {/* Back + header */}
        <div className="space-y-5">
          <Link
            href="/admin/bookings"
            className="link-accent inline-flex items-center gap-1.5 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Bookings
          </Link>

          <header className="page-header !mb-0 !pb-6">
            <span className="page-eyebrow">
              <Activity className="h-3.5 w-3.5" />
              Admin · Booking
            </span>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="page-title text-gradient-on-dark">Booking Detail</h1>
              <span className={`pill ${statusPill[booking.status] ?? "pill-neutral"}`}>
                <span className="pill-dot" />
                {booking.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="page-subtitle font-mono text-xs text-faint">{booking.id}</p>
          </header>
        </div>

        {/* Booking Info */}
        <section className="surface-card space-y-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-faint">
                <Activity className="h-3.5 w-3.5" /> Status
              </p>
              <span className={`pill ${statusPill[booking.status] ?? "pill-neutral"}`}>
                {booking.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-faint">
                <MapPin className="h-3.5 w-3.5" /> Area
              </p>
              <p className="font-medium text-slate-100">{booking.area ?? "—"}</p>
            </div>
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-faint">
                <CalendarClock className="h-3.5 w-3.5" /> Scheduled
              </p>
              <p className="font-medium text-slate-100">
                {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : "—"}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-faint">
                <Clock className="h-3.5 w-3.5" /> Hours
              </p>
              <p className="font-medium text-slate-100">{booking.hours ?? "—"}</p>
            </div>
          </div>

          <hr className="divider" />

          {/* Money breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="surface-muted !p-4">
              <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-faint">
                <Wallet className="h-3.5 w-3.5" /> Total
              </p>
              <p className="mt-1.5 text-xl font-bold text-gradient-on-dark">
                ${Number(booking.total_amount ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="surface-muted !p-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-faint">Deposit</p>
              <p className="mt-1.5 text-xl font-semibold text-slate-100">
                ${Number(booking.deposit_amount ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="surface-muted !p-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-faint">Balance</p>
              <p className="mt-1.5 text-xl font-semibold text-slate-100">
                ${Number(booking.balance_amount ?? 0).toFixed(2)}
              </p>
            </div>
          </div>

          {addressRow?.full_address && (
            <div className="surface-muted flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-teal-300">
                <Home className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-faint">Address</p>
                <p className="mt-0.5 font-medium text-slate-100">{addressRow.full_address}</p>
              </div>
            </div>
          )}

          {booking.cancellation_reason && (
            <div className="flex items-start gap-3 rounded-[0.85rem] border border-red-500/20 bg-red-500/[0.06] p-4">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 text-red-300">
                <Ban className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-red-300/80">
                  Cancellation · by {booking.cancelled_by ?? "unknown"}
                </p>
                <p className="mt-0.5 text-sm text-red-200">{booking.cancellation_reason}</p>
              </div>
            </div>
          )}
        </section>

        {/* People */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="surface-card">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-teal-300">
                <User className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-dim">Customer</h3>
            </div>
            {customer ? (
              <>
                <p className="font-semibold text-slate-100">{customer.name ?? "—"}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-dim">
                  <Phone className="h-3.5 w-3.5" /> {customer.phone ?? "—"}
                </p>
                <Link
                  href={`/admin/customers/${customer.id}`}
                  className="link-accent mt-3 inline-flex items-center gap-1 text-xs font-medium"
                >
                  View profile <ArrowUpRight className="h-3 w-3" />
                </Link>
              </>
            ) : (
              <p className="text-sm text-faint">No customer assigned</p>
            )}
          </div>
          <div className="surface-card">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-teal-300">
                <Sparkles className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-dim">Cleaner</h3>
            </div>
            {cleaner ? (
              <>
                <p className="font-semibold text-slate-100">{cleaner.name ?? "—"}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-dim">
                  <Phone className="h-3.5 w-3.5" /> {cleaner.phone ?? "—"}
                </p>
                <Link
                  href={`/admin/cleaners/${cleaner.id}`}
                  className="link-accent mt-3 inline-flex items-center gap-1 text-xs font-medium"
                >
                  View profile <ArrowUpRight className="h-3 w-3" />
                </Link>
              </>
            ) : (
              <p className="text-sm text-faint">No cleaner assigned yet</p>
            )}
          </div>
        </div>

        {/* Offers */}
        {offers && offers.length > 0 && (
          <section className="surface-card">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-teal-300">
                <Inbox className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-slate-100">
                Offers <span className="font-normal text-faint">({offers.length})</span>
              </h2>
            </div>
            <div className="table-wrap">
              <table className="table-dark">
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
                        <td className="font-medium text-slate-200">{offerCleaner?.name ?? "—"}</td>
                        <td>
                          <span
                            className={`pill ${
                              o.state === "accepted"
                                ? "pill-success"
                                : o.state === "declined"
                                ? "pill-danger"
                                : "pill-neutral"
                            }`}
                          >
                            {o.state}
                          </span>
                        </td>
                        <td className="text-xs text-faint">{new Date(o.created_at).toLocaleString()}</td>
                        <td className="text-xs text-faint">
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
          <section className="surface-card">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-teal-300">
                <CreditCard className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-slate-100">Payments</h2>
            </div>
            <div className="table-wrap">
              <table className="table-dark">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Paid At</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="capitalize text-slate-200">{p.type}</td>
                      <td className="font-medium text-slate-100">${Number(p.amount).toFixed(2)}</td>
                      <td>
                        <span className={`pill ${p.status === "paid" ? "pill-success" : "pill-warning"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="text-xs text-faint">
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
          <section className="surface-card">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-amber-300">
                <Star className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-slate-100">Reviews</h2>
            </div>
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="surface-muted">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                      <Star className="h-3.5 w-3.5 fill-amber-300" />
                      {r.rating}/5
                    </span>
                    <span className="text-xs text-faint">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-dim">{r.comment}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Disputes */}
        {disputes && disputes.length > 0 && (
          <section className="surface-card">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 text-red-300">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-slate-100">Disputes</h2>
            </div>
            <div className="space-y-3">
              {disputes.map((d) => (
                <div
                  key={d.id}
                  className="surface-muted flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="pill pill-danger">{d.status}</span>
                      <span className="text-sm font-medium capitalize text-slate-200">
                        {d.category.replace(/_/g, " ")}
                      </span>
                    </div>
                    {d.description && <p className="mt-2 text-sm text-dim">{d.description}</p>}
                  </div>
                  <Link
                    href={`/admin/disputes/${d.id}`}
                    className="link-accent inline-flex shrink-0 items-center gap-1 text-xs font-medium"
                  >
                    Manage <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Admin Actions */}
        <section className="surface-card space-y-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-teal-400/25 bg-teal-400/10 text-teal-300">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-slate-100">Admin Actions</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Override Status */}
            <div className="surface-muted">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-200">
                <RefreshCw className="h-4 w-4 text-teal-300" /> Override Status
              </h3>
              <form action={updateBookingStatus} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="booking_id" value={booking.id} />
                <select name="new_status" className="input-dark !w-auto flex-1" defaultValue={booking.status}>
                  {BOOKING_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <button type="submit" className="btn-base btn-glow">Update Status</button>
              </form>
            </div>

            {/* Reassign Cleaner */}
            <div className="surface-muted">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-200">
                <UserCog className="h-4 w-4 text-teal-300" /> Reassign Cleaner
              </h3>
              {eligibleCleaners.length === 0 ? (
                <p className="text-sm text-faint">No eligible cleaners in {booking.area}.</p>
              ) : (
                <form action={reassignCleaner} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="booking_id" value={booking.id} />
                  <select name="cleaner_id" className="input-dark !w-auto flex-1" required>
                    <option value="">Select cleaner…</option>
                    {eligibleCleaners.map((c) => (
                      <option key={c.id} value={c.id}>{c.name ?? c.id}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-base btn-outline">Reassign</button>
                </form>
              )}
            </div>

            {/* Cancel Booking */}
            {booking.status !== "cancelled" && (
              <div className="rounded-[0.85rem] border border-red-500/20 bg-red-500/[0.05] p-5 lg:col-span-2">
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-red-200">
                  <XCircle className="h-4 w-4 text-red-300" /> Cancel Booking
                </h3>
                <form action={adminCancelBooking} className="space-y-3">
                  <input type="hidden" name="booking_id" value={booking.id} />
                  <input
                    name="reason"
                    placeholder="Cancellation reason (required)"
                    required
                    className="input-dark w-full"
                  />
                  <button
                    type="submit"
                    className="btn-base inline-flex items-center gap-2 border border-red-500/30 bg-red-500/15 text-red-200 transition hover:border-red-500/50 hover:bg-red-500/25"
                  >
                    <XCircle className="h-4 w-4" /> Cancel Booking
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
