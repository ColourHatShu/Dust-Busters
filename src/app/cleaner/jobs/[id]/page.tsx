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
} from "lucide-react";
import { bookingBadgeClass, bookingStatusLabel } from "@/lib/status";

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
    <main className="mx-auto max-w-lg space-y-6 p-6">
      {/* Back link */}
      <Link
        href="/cleaner/jobs"
        className="link-subtle inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        Back to jobs
      </Link>

      {/* Header + status badge */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">Job details</h1>
        <span className={bookingBadgeClass(booking.status)}>
          {bookingStatusLabel(booking.status)}
        </span>
      </div>

      {/* Booking detail card */}
      <div className="card">
        <div className="detail-row">
          <span className="detail-label">
            <Calendar className="h-4 w-4" strokeWidth={1.5} />
            Date & time
          </span>
          <span className="detail-value">
            {new Date(booking.scheduled_at).toLocaleString()}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">
            <Clock className="h-4 w-4" strokeWidth={1.5} />
            Duration
          </span>
          <span className="detail-value">{booking.hours} hours</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">
            <MapPin className="h-4 w-4" strokeWidth={1.5} />
            Area
          </span>
          <span className="detail-value">{booking.area}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">
            <DollarSign className="h-4 w-4" strokeWidth={1.5} />
            Your gross
          </span>
          <span className="detail-value text-emerald-700">
            ${Number(booking.total_amount).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Customer card */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-sm icon-tile-soft">
            <User className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <div>
            <p className="eyebrow-label">Customer</p>
            <p className="font-semibold text-slate-900">{customerName}</p>
          </div>
        </div>
        {!DEPOSIT_PAID_AND_LATER.has(booking.status) && (
          <div className="alert alert-info">
            <Lock className="h-4 w-4" strokeWidth={1.5} />
            <span>Full address revealed once the customer pays the deposit</span>
          </div>
        )}
      </div>

      {/* Address card (deposit_paid and later) */}
      {address && (
        <div className="card flex items-start gap-4">
          <span className="icon-tile icon-tile-soft">
            <Home className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <div>
            <p className="eyebrow-label">Service address</p>
            <p className="mt-1 text-slate-900">{address}</p>
          </div>
        </div>
      )}

      {notes && (
        <div className="card flex items-start gap-4">
          <span className="icon-tile icon-tile-soft">
            <ClipboardList className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <div>
            <p className="eyebrow-label">Customer instructions</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-900">{notes}</p>
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
              <button className="btn-base btn-primary w-full">
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
              <button className="btn-base btn-primary w-full">
                <CheckCircle className="h-5 w-5" strokeWidth={1.5} />
                Mark as complete
              </button>
            </form>
          )}
        </div>
      )}

      {/* Report a problem (cleaner-side dispute) */}
      {reported === "1" && (
        <div className="alert alert-success">
          <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
          <span>
            Thanks — your report was submitted. Our team will review it and
            follow up.
          </span>
        </div>
      )}
      {reportError && (
        <div className="alert alert-error">
          <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
          <span>{reportError}</span>
        </div>
      )}
      {DISPUTABLE.has(booking.status) && (
        <details className="card group">
          <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-semibold text-slate-800">
            <span className="icon-tile icon-tile-sm icon-tile-warn">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
            </span>
            Report a problem with this job
          </summary>
          <form
            action={reportProblem.bind(null, id)}
            className="mt-4 flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1.5">
              <span className="form-label">Issue</span>
              <select name="category" className="input-modern" required>
                <option value="no_show">Customer no-show / no access</option>
                <option value="other">Unsafe or inappropriate conditions</option>
                <option value="payment_issue">Payment issue</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="form-label">What happened?</span>
              <textarea
                name="description"
                required
                rows={4}
                className="input-modern"
                placeholder="Describe the problem. For emergencies, contact local authorities first."
              />
            </label>
            <button className="btn-base btn-secondary self-start text-sm">
              Submit report
            </button>
          </form>
        </details>
      )}

      {/* Rate the customer (two-way reviews) */}
      {canReviewCustomer && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Rate the customer</h2>
            {customerRating?.avg_rating != null && (
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {customerRating.avg_rating}
                <span className="text-slate-400">
                  ({customerRating.review_count})
                </span>
              </span>
            )}
          </div>

          {alreadyReviewedCustomer ? (
            <div className="alert alert-success">
              <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
              <span>Thanks — you&apos;ve rated this customer.</span>
            </div>
          ) : (
            <form
              action={submitCustomerReview.bind(null, id, booking.customer_id)}
              className="flex flex-col gap-4"
            >
              <StarRating />
              <textarea
                name="comment"
                rows={3}
                placeholder="Any notes about the property or visit (optional)"
                className="input-modern"
              />
              <button className="btn-base btn-primary self-start text-sm">
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
    </main>
  );
}
