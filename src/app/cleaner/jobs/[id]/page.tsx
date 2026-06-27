import { redirect, notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { startJob, completeJob } from "../../actions";
import { reportProblem } from "./report-actions";
import { submitCustomerReview } from "./customer-review-actions";
import StarRating from "@/app/bookings/[id]/review/StarRating";
import MessagePanel from "@/components/MessagePanel";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Home,
  User,
  DollarSign,
  PlayCircle,
  CheckCircle,
  Lock,
  AlertTriangle,
  Star,
  ClipboardList,
  ChevronDown,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  accepted: "Cleaner assigned — awaiting deposit",
  deposit_paid: "Deposit paid — ready to start",
  in_progress: "Job in progress",
  completed: "Completed — awaiting balance payment",
  balance_paid: "Paid in full",
  closed: "Closed",
};

const STATUS_PILL: Record<string, string> = {
  accepted: "pill-warning",
  deposit_paid: "pill-success",
  in_progress: "pill-info",
  completed: "pill-accent",
  balance_paid: "pill-success",
  closed: "pill-neutral",
};

const DEPOSIT_PAID_AND_LATER = new Set([
  "deposit_paid",
  "in_progress",
  "completed",
  "balance_paid",
  "closed",
]);

// Statuses in which a dispute can be raised (matches open_dispute).
const DISPUTABLE = new Set(["deposit_paid", "in_progress", "completed"]);

export default async function CleanerJobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reported?: string; reportError?: string }>;
}) {
  const { id } = await params;
  const { reported, reportError } = await searchParams;
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "cleaner") redirect("/cleaner/onboard");

  const supabase = await createClient();

  // Fetch booking, verify cleaner is assigned
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `id, status, scheduled_at, hours, area, total_amount, deposit_amount, balance_amount,
       cleaner_id, customer_id, notes,
       profiles!bookings_customer_id_fkey(name),
       booking_addresses(full_address)`
    )
    .eq("id", id)
    .single();

  if (!booking) notFound();

  // Only the assigned cleaner can view this page
  if (booking.cleaner_id !== user.id) redirect("/cleaner/jobs");

  const customerProfile = Array.isArray(booking.profiles)
    ? booking.profiles[0]
    : booking.profiles;
  const addrData = Array.isArray(booking.booking_addresses)
    ? booking.booking_addresses[0]
    : booking.booking_addresses;

  const customerName =
    (customerProfile as { name: string } | null)?.name ?? "Customer";
  const address = DEPOSIT_PAID_AND_LATER.has(booking.status)
    ? (addrData as { full_address: string } | null)?.full_address ?? null
    : null;
  const notes = DEPOSIT_PAID_AND_LATER.has(booking.status)
    ? (booking.notes as string | null)
    : null;

  // Load initial messages for MessagePanel
  const { data: rawMessages } = await supabase
    .from("booking_messages")
    .select("id, sender_id, body, created_at, profiles(name)")
    .eq("booking_id", id)
    .order("created_at", { ascending: true });

  const initialMessages = (rawMessages ?? []).map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    body: m.body,
    created_at: m.created_at,
    profiles: Array.isArray(m.profiles)
      ? (m.profiles[0] as { name: string } | null) ?? null
      : (m.profiles as { name: string } | null),
  }));

  const showStart = booking.status === "deposit_paid";
  const showComplete = booking.status === "in_progress";

  // Two-way reviews: once the job is done, the cleaner can rate the customer.
  const REVIEWABLE = new Set(["completed", "balance_paid", "closed"]);
  const canReviewCustomer = REVIEWABLE.has(booking.status);
  let alreadyReviewedCustomer = false;
  let customerRating: { avg_rating: number | null; review_count: number } | null =
    null;
  if (canReviewCustomer) {
    const { data: existing } = await supabase
      .from("customer_reviews")
      .select("id")
      .eq("booking_id", id)
      .maybeSingle();
    alreadyReviewedCustomer = !!existing;

    const { data: rating } = await supabase.rpc("get_customer_rating", {
      p_customer: booking.customer_id,
    });
    const r = Array.isArray(rating) ? rating[0] : rating;
    customerRating = r ?? null;
  }

  return (
    <main className="app-shell min-h-screen py-10 sm:py-14">
      <span
        className="section-glow section-glow--teal absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2"
        aria-hidden
      />
      <span
        className="section-glow section-glow--sky absolute top-40 -right-20 h-64 w-64"
        aria-hidden
      />

      <div className="app-container relative z-10 max-w-2xl">
        {/* Back link */}
        <Link
          href="/cleaner/jobs"
          className="inline-flex items-center gap-1.5 text-sm text-dim transition-colors hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to jobs
        </Link>

        {/* Header + status badge */}
        <header className="page-header mt-5">
          <span className="page-eyebrow">
            <ClipboardList className="h-3.5 w-3.5" strokeWidth={2} />
            Cleaner workspace
          </span>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="page-title">Job details</h1>
            <span
              className={`pill ${STATUS_PILL[booking.status] ?? "pill-neutral"}`}
            >
              <span className="pill-dot" />
              {STATUS_LABEL[booking.status] ?? booking.status}
            </span>
          </div>
        </header>

        <div className="space-y-6">
          {/* Booking detail card */}
          <div className="surface-card">
            <dl className="divide-y divide-white/5">
              <div className="flex items-center justify-between py-3 first:pt-0">
                <dt className="flex items-center gap-2.5 text-sm text-dim">
                  <Calendar
                    className="h-4 w-4 text-teal-300/80"
                    strokeWidth={1.5}
                  />
                  Date &amp; time
                </dt>
                <dd className="text-sm font-medium text-slate-100">
                  {new Date(booking.scheduled_at).toLocaleString()}
                </dd>
              </div>

              <div className="flex items-center justify-between py-3">
                <dt className="flex items-center gap-2.5 text-sm text-dim">
                  <Clock className="h-4 w-4 text-teal-300/80" strokeWidth={1.5} />
                  Duration
                </dt>
                <dd className="text-sm font-medium text-slate-100">
                  {booking.hours} hours
                </dd>
              </div>

              <div className="flex items-center justify-between py-3">
                <dt className="flex items-center gap-2.5 text-sm text-dim">
                  <MapPin className="h-4 w-4 text-teal-300/80" strokeWidth={1.5} />
                  Area
                </dt>
                <dd className="text-sm font-medium text-slate-100">
                  {booking.area}
                </dd>
              </div>

              <div className="flex items-center justify-between py-3 last:pb-0">
                <dt className="flex items-center gap-2.5 text-sm text-dim">
                  <DollarSign
                    className="h-4 w-4 text-teal-300/80"
                    strokeWidth={1.5}
                  />
                  Your gross
                </dt>
                <dd className="text-lg font-bold text-gradient-on-dark">
                  ${Number(booking.total_amount).toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Customer card */}
          <div className="surface-card space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-dim">
              <User className="h-4 w-4 text-teal-300/80" strokeWidth={1.5} />
              Customer
            </div>
            <p className="text-lg font-semibold text-slate-100">{customerName}</p>
            {!DEPOSIT_PAID_AND_LATER.has(booking.status) && (
              <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-xs text-faint">
                <Lock
                  className="h-3.5 w-3.5 flex-shrink-0"
                  strokeWidth={1.5}
                />
                <span>
                  Full address revealed once the customer pays the deposit
                </span>
              </div>
            )}
          </div>

          {/* Address card (deposit_paid and later) */}
          {address && (
            <div className="surface-card flex items-start gap-3.5">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-400/10 text-teal-300">
                <Home className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-dim">
                  Service address
                </p>
                <p className="mt-1 text-slate-100">{address}</p>
              </div>
            </div>
          )}

          {notes && (
            <div className="surface-card flex items-start gap-3.5">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-400/10 text-teal-300">
                <ClipboardList className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-dim">
                  Customer instructions
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-100">{notes}</p>
              </div>
            </div>
          )}

          {/* Cleaner action buttons */}
          {(showStart || showComplete) && (
            <div className="space-y-3">
              {showStart && (
                <form
                  action={async () => {
                    "use server";
                    await startJob(id);
                    redirect(`/cleaner/jobs/${id}`);
                  }}
                >
                  <button className="btn-base btn-glow w-full">
                    <PlayCircle className="h-5 w-5" strokeWidth={1.5} />
                    Start this job
                  </button>
                </form>
              )}
              {showComplete && (
                <form
                  action={async () => {
                    "use server";
                    await completeJob(id);
                    redirect(`/cleaner/jobs/${id}`);
                  }}
                >
                  <button className="btn-base btn-glow w-full">
                    <CheckCircle className="h-5 w-5" strokeWidth={1.5} />
                    Mark as complete
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Report a problem (cleaner-side dispute) */}
          {reported === "1" && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
              <CheckCircle
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400"
                strokeWidth={2}
              />
              <span>
                Thanks — your report was submitted. Our team will review it and
                follow up.
              </span>
            </div>
          )}
          {reportError && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400"
                strokeWidth={2}
              />
              <span>{reportError}</span>
            </div>
          )}
          {DISPUTABLE.has(booking.status) && (
            <details className="surface-card group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-slate-200">
                <span className="flex items-center gap-2">
                  <AlertTriangle
                    className="h-4 w-4 text-amber-400"
                    strokeWidth={1.5}
                  />
                  Report a problem with this job
                </span>
                <ChevronDown
                  className="h-4 w-4 text-faint transition-transform duration-200 group-open:rotate-180"
                  strokeWidth={1.5}
                />
              </summary>
              <hr className="divider my-4" />
              <form
                action={reportProblem.bind(null, id)}
                className="flex flex-col gap-4"
              >
                <label className="block">
                  <span className="field-label">Issue</span>
                  <select name="category" className="input-dark" required>
                    <option value="no_show">Customer no-show / no access</option>
                    <option value="other">
                      Unsafe or inappropriate conditions
                    </option>
                    <option value="payment_issue">Payment issue</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">What happened?</span>
                  <textarea
                    name="description"
                    required
                    rows={4}
                    className="input-dark"
                    placeholder="Describe the problem. For emergencies, contact local authorities first."
                  />
                </label>
                <button className="btn-base btn-outline self-start text-sm">
                  Submit report
                </button>
              </form>
            </details>
          )}

          {/* Rate the customer (two-way reviews) */}
          {canReviewCustomer && (
            <div className="surface-card space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-100">
                  Rate the customer
                </h2>
                {customerRating?.avg_rating != null && (
                  <span className="pill pill-warning">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {customerRating.avg_rating}
                    <span className="text-faint">
                      ({customerRating.review_count})
                    </span>
                  </span>
                )}
              </div>

              {alreadyReviewedCustomer ? (
                <p className="flex items-center gap-1.5 text-sm text-dim">
                  <CheckCircle
                    className="h-4 w-4 text-emerald-400"
                    strokeWidth={2}
                  />
                  Thanks — you&apos;ve rated this customer.
                </p>
              ) : (
                <form
                  action={submitCustomerReview.bind(null, id, booking.customer_id)}
                  className="flex flex-col gap-4"
                >
                  <div className="surface-muted flex justify-center">
                    <StarRating />
                  </div>
                  <textarea
                    name="comment"
                    rows={3}
                    placeholder="Any notes about the property or visit (optional)"
                    className="input-dark"
                  />
                  <button className="btn-base btn-glow self-start text-sm">
                    Submit rating
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Messaging */}
          <MessagePanel
            bookingId={id}
            currentUserId={user.id}
            initialMessages={initialMessages}
          />
        </div>
      </div>
    </main>
  );
}
