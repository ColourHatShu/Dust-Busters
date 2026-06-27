import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldAlert,
  FileText,
  CheckCircle2,
  CalendarClock,
  User,
  UserRound,
  UserCog,
  MapPin,
  ArrowUpRight,
  ClipboardCheck,
  Save,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateDisputeStatus, issueRefund } from "./actions";

const DISPUTE_STATUSES = ["open", "investigating", "resolved", "closed"];

const statusPill: Record<string, string> = {
  open: "pill-danger",
  investigating: "pill-warning",
  resolved: "pill-success",
  closed: "pill-neutral",
};

const iconTile =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-emerald-500/15 to-sky-500/10 text-teal-300";

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

  return (
    <main className="app-shell">
      {/* Ambient depth glows */}
      <span className="section-glow absolute -top-24 left-1/4 h-72 w-72" aria-hidden="true" />
      <span
        className="section-glow section-glow--sky absolute top-32 right-0 h-80 w-80"
        aria-hidden="true"
      />

      <div className="app-container relative z-10 py-10 space-y-8">
        {/* Back link */}
        <Link
          href="/admin/disputes"
          className="link-accent inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Disputes
        </Link>

        {/* Page header */}
        <header className="page-header">
          <span className="page-eyebrow">
            <ShieldAlert className="h-3.5 w-3.5" />
            Dispute Resolution
          </span>
          <h1 className="page-title">Dispute Detail</h1>
          <p className="page-subtitle">
            Review the case, update its status, and issue refunds where the evidence
            warrants it.
          </p>
        </header>

        {/* Dispute Summary */}
        <section className="surface-card space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`pill ${statusPill[dispute.status] ?? "pill-neutral"} capitalize`}>
              <span className="pill-dot" />
              {dispute.status}
            </span>
            {dispute.category && (
              <span className="pill pill-accent capitalize">{dispute.category}</span>
            )}
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-faint">
              <CalendarClock className="h-3.5 w-3.5" />
              {new Date(dispute.created_at).toLocaleString()}
            </span>
          </div>

          <div className="surface-muted">
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-dim">
              <FileText className="h-3.5 w-3.5" />
              Description
            </p>
            <p className="text-sm leading-relaxed text-slate-300">
              {dispute.description ?? "No description provided."}
            </p>
          </div>

          {dispute.resolution && (
            <div className="surface-muted border-emerald-500/20">
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300/90">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Resolution
              </p>
              <p className="text-sm leading-relaxed text-slate-300">{dispute.resolution}</p>
            </div>
          )}
        </section>

        {/* People */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="surface-card surface-card-interactive">
            <div className="mb-4 flex items-center gap-3">
              <span className={iconTile}>
                <User className="h-5 w-5" />
              </span>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-dim">
                Raised By
              </h3>
            </div>
            <p className="font-medium text-slate-100">{raisedBy?.name ?? "—"}</p>
            <p className="mt-0.5 text-sm text-faint">{raisedBy?.phone ?? "—"}</p>
          </div>

          <div className="surface-card surface-card-interactive">
            <div className="mb-4 flex items-center gap-3">
              <span className={iconTile}>
                <UserRound className="h-5 w-5" />
              </span>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-dim">
                Customer
              </h3>
            </div>
            {customer ? (
              <>
                <p className="font-medium text-slate-100">{customer.name ?? "—"}</p>
                <p className="mt-0.5 text-sm text-faint">{customer.phone ?? "—"}</p>
                <Link
                  href={`/admin/customers/${customer.id}`}
                  className="link-accent mt-3 inline-flex items-center gap-1 text-xs font-medium"
                >
                  View profile
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              <p className="text-sm text-faint">—</p>
            )}
          </div>

          <div className="surface-card surface-card-interactive">
            <div className="mb-4 flex items-center gap-3">
              <span className={iconTile}>
                <UserCog className="h-5 w-5" />
              </span>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-dim">
                Cleaner
              </h3>
            </div>
            {cleaner ? (
              <>
                <p className="font-medium text-slate-100">{cleaner.name ?? "—"}</p>
                <p className="mt-0.5 text-sm text-faint">{cleaner.phone ?? "—"}</p>
                <Link
                  href={`/admin/cleaners/${cleaner.id}`}
                  className="link-accent mt-3 inline-flex items-center gap-1 text-xs font-medium"
                >
                  View profile
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              <p className="text-sm text-faint">—</p>
            )}
          </div>
        </div>

        {/* Booking Info */}
        {booking && (
          <div className="surface-card flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className={iconTile}>
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-dim">
                  Booking
                </p>
                <p className="mt-1 font-medium text-slate-100">
                  {booking.area ?? "—"}
                  {booking.scheduled_at && (
                    <span className="ml-2 text-sm font-normal text-faint">
                      · {new Date(booking.scheduled_at).toLocaleString()}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-dim">
                  Total:{" "}
                  <span className="font-semibold text-emerald-300">
                    ${Number(booking.total_amount ?? 0).toFixed(2)}
                  </span>
                </p>
              </div>
            </div>
            <Link
              href={`/admin/bookings/${booking.id}`}
              className="link-accent inline-flex items-center gap-1 text-sm font-medium"
            >
              View booking
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Action forms */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          {/* Resolution Form */}
          <section className="surface-card space-y-5">
            <div className="flex items-center gap-3">
              <span className={iconTile}>
                <ClipboardCheck className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-semibold text-slate-100">Update Resolution</h2>
            </div>
            <form action={updateDisputeStatus} className="space-y-4">
              <input type="hidden" name="dispute_id" value={dispute.id} />
              <div>
                <label className="field-label">Status</label>
                <select name="status" className="input-dark" defaultValue={dispute.status}>
                  {DISPUTE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Resolution Notes</label>
                <textarea
                  name="resolution"
                  rows={3}
                  defaultValue={dispute.resolution ?? ""}
                  placeholder="Describe the resolution…"
                  className="input-dark"
                />
              </div>
              <button type="submit" className="btn-base btn-glow w-full sm:w-auto">
                <Save className="h-4 w-4" />
                Save Resolution
              </button>
            </form>
          </section>

          {/* Issue Refund */}
          <section className="surface-card space-y-5">
            <div className="flex items-center gap-3">
              <span className={iconTile}>
                <RotateCcw className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-semibold text-slate-100">Issue Refund</h2>
            </div>
            {(payments ?? []).length === 0 ? (
              <div className="surface-muted flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400/80" />
                <p className="text-sm text-faint">No paid payments available to refund.</p>
              </div>
            ) : (
              <form action={issueRefund} className="space-y-4">
                <input type="hidden" name="dispute_id" value={dispute.id} />
                <input type="hidden" name="booking_id" value={dispute.booking_id} />
                <div>
                  <label className="field-label">Payment to Refund</label>
                  <select name="payment_id" className="input-dark">
                    {(payments ?? []).map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        data-intent={p.stripe_payment_intent_id ?? "none"}
                      >
                        {p.type} — ${Number(p.amount).toFixed(2)} ({p.status})
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
                  <label className="field-label">Refund Amount ($)</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    min="0.01"
                    max={Number(payments?.[0]?.amount ?? 0)}
                    required
                    placeholder="0.00"
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="field-label">Reason</label>
                  <input
                    type="text"
                    name="reason"
                    required
                    placeholder="Reason for refund"
                    className="input-dark"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-base w-full bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_10px_30px_-10px_rgba(244,63,94,0.6)] transition-transform hover:-translate-y-0.5 hover:from-rose-400 hover:to-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4" />
                  Issue Refund
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
