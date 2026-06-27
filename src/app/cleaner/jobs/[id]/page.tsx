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

const STATUS_LABEL: Record<string, string> = {
  accepted: "Cleaner assigned — awaiting deposit",
  deposit_paid: "Deposit paid — ready to start",
  in_progress: "Job in progress",
  completed: "Completed — awaiting balance payment",
  balance_paid: "Paid in full",
  closed: "Closed",
};

const STATUS_COLOR: Record<string, string> = {
  accepted: "bg-yellow-100 text-yellow-700",
  deposit_paid: "bg-green-100 text-green-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-orange-100 text-orange-700",
  balance_paid: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
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
    <main className="mx-auto max-w-lg space-y-6 p-6">
      {/* Back link */}
      <Link
        href="/cleaner/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        Back to jobs
      </Link>

      {/* Status badge */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Job details</h1>
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
            STATUS_COLOR[booking.status] ?? "bg-slate-100 text-slate-600"
          }`}
        >
          {STATUS_LABEL[booking.status] ?? booking.status}
        </span>
      </div>

      {/* Booking detail card */}
      <div className="card space-y-4">
        <div className="flex justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-sm">Date & time</span>
          </div>
          <span className="text-sm font-medium text-slate-900">
            {new Date(booking.scheduled_at).toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-sm">Duration</span>
          </div>
          <span className="text-sm font-medium text-slate-900">
            {booking.hours} hours
          </span>
        </div>

        <div className="flex justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-slate-500">
            <MapPin className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-sm">Area</span>
          </div>
          <span className="text-sm font-medium text-slate-900">
            {booking.area}
          </span>
        </div>

        <div className="flex justify-between">
          <div className="flex items-center gap-2 text-slate-500">
            <DollarSign className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-sm">Your gross</span>
          </div>
          <span className="text-sm font-bold text-teal-700">
            ${Number(booking.total_amount).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Customer card */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 text-slate-500">
          <User className="h-4 w-4" strokeWidth={1.5} />
          <span className="text-sm font-medium text-slate-700">Customer</span>
        </div>
        <p className="font-semibold text-slate-900">{customerName}</p>
        {!DEPOSIT_PAID_AND_LATER.has(booking.status) && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
            <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Full address revealed once the customer pays the deposit</span>
          </div>
        )}
      </div>

      {/* Address card (deposit_paid and later) */}
      {address && (
        <div className="card flex items-start gap-3">
          <Home
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-teal-600"
            strokeWidth={1.5}
          />
          <div>
            <p className="text-sm font-medium text-slate-700">
              Service address
            </p>
            <p className="mt-0.5 text-slate-900">{address}</p>
          </div>
        </div>
      )}

      {notes && (
        <div className="card flex items-start gap-3">
          <ClipboardList
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-teal-600"
            strokeWidth={1.5}
          />
          <div>
            <p className="text-sm font-medium text-slate-700">
              Customer instructions
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-slate-900">{notes}</p>
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
              <button className="w-full btn-base btn-primary flex items-center justify-center gap-2">
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
              <button className="w-full btn-base btn-primary flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5" strokeWidth={1.5} />
                Mark as complete
              </button>
            </form>
          )}
        </div>
      )}

      {/* Report a problem (cleaner-side dispute) */}
      {reported === "1" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Thanks — your report was submitted. Our team will review it and follow up.
        </div>
      )}
      {reportError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {reportError}
        </div>
      )}
      {DISPUTABLE.has(booking.status) && (
        <details className="card group">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-700">
            <AlertTriangle
              className="h-4 w-4 text-amber-500"
              strokeWidth={1.5}
            />
            Report a problem with this job
          </summary>
          <form
            action={reportProblem.bind(null, id)}
            className="mt-4 flex flex-col gap-3"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">Issue</span>
              <select name="category" className="input-modern" required>
                <option value="no_show">Customer no-show / no access</option>
                <option value="other">Unsafe or inappropriate conditions</option>
                <option value="payment_issue">Payment issue</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">
                What happened?
              </span>
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
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Rate the customer</h2>
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
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              <CheckCircle className="h-4 w-4 text-green-600" strokeWidth={2} />
              Thanks — you&apos;ve rated this customer.
            </p>
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
