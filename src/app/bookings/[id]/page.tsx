import { redirect, notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StatusLive from "./StatusLive";
import MessagePanel from "./MessagePanel";
import { payDeposit, payBalance } from "./payment-actions";
import { cancelBooking } from "./cancel-actions";
import MatchingMap, { type MatchingData } from "./matching/MatchingMap";
import {
  Calendar,
  Clock,
  MapPin,
  Home,
  Lock,
  CheckCircle,
  Star,
  XCircle,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  Pencil,
} from "lucide-react";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  broadcasting: "Finding a cleaner near you...",
  accepted: "Cleaner found! Confirm with your deposit.",
  deposit_paid: "Deposit paid. Your cleaner is booked.",
  in_progress: "Your cleaning is in progress.",
  completed: "Cleaning complete. Please pay the balance.",
  balance_paid: "Paid in full. Thank you!",
  closed: "Closed.",
  cancelled: "Cancelled.",
  no_cleaner_found: "Sorry, no cleaner was available for this slot.",
};

const STATUS_COLOR: Record<string, string> = {
  broadcasting: "bg-blue-100 text-blue-700",
  accepted: "bg-yellow-100 text-yellow-700",
  deposit_paid: "bg-green-100 text-green-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-orange-100 text-orange-700",
  balance_paid: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
  no_cleaner_found: "bg-red-100 text-red-700",
};

const CANCEL_ALLOWED = ["broadcasting", "accepted", "deposit_paid"];
const DISPUTE_ALLOWED = ["deposit_paid", "in_progress", "completed"];
const MESSAGE_ALLOWED = ["accepted", "deposit_paid", "in_progress", "completed", "balance_paid"];
const REVIEW_ALLOWED = ["completed", "balance_paid"];
const BOOK_AGAIN_ALLOWED = ["closed", "balance_paid", "cancelled"];

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles: { name: string } | null;
};

export default async function BookingStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { id } = await params;
  const { cancelled } = await searchParams;
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, scheduled_at, hours, area, total_amount, deposit_amount, balance_amount, cleaner_id, customer_id"
    )
    .eq("id", id)
    .eq("customer_id", user.id)
    .single();
  if (!booking) notFound();

  // Live matching map data (only while the search/match is active).
  const ACTIVE_MATCH = new Set([
    "broadcasting",
    "accepted",
    "no_cleaner_found",
  ]);
  let matching: MatchingData | null = null;
  if (ACTIVE_MATCH.has(booking.status)) {
    const { data: m } = await supabase.rpc("get_booking_matching", {
      p_booking_id: id,
    });
    matching = (m as MatchingData) ?? null;
  }

  let cleaner: { name: string; id_verified: boolean; jobs_completed: number } | null =
    null;
  if (booking.cleaner_id) {
    const { data } = await supabase.rpc("get_cleaner_card", {
      p_cleaner: booking.cleaner_id,
    });
    cleaner = Array.isArray(data) ? data[0] : data;
  }

  const { data: address } = await supabase
    .from("booking_addresses")
    .select("full_address")
    .eq("booking_id", id)
    .maybeSingle();

  // Check if a review already exists
  let hasReview = false;
  if (REVIEW_ALLOWED.includes(booking.status)) {
    // reviews are 1:1 with a booking (booking_id is unique), and this booking
    // was already loaded for the current user — so booking_id alone is the
    // correct existence check. (There is no reviewer_id column on reviews.)
    const { count } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", id);
    hasReview = (count ?? 0) > 0;
  }

  // Fetch initial messages if messaging is enabled
  let initialMessages: Message[] = [];
  if (booking.cleaner_id && MESSAGE_ALLOWED.includes(booking.status)) {
    const { data: msgs } = await supabase
      .from("booking_messages")
      .select("id, sender_id, body, created_at, profiles(name)")
      .eq("booking_id", id)
      .order("created_at", { ascending: true })
      .limit(100);
    initialMessages = (msgs ?? []).map((m) => ({
      ...m,
      profiles: Array.isArray(m.profiles) ? (m.profiles[0] ?? null) : m.profiles,
    })) as Message[];
  }

  const showDeposit = booking.status === "accepted";
  const showBalance = booking.status === "completed";
  const showCancel = CANCEL_ALLOWED.includes(booking.status);
  const showDispute = DISPUTE_ALLOWED.includes(booking.status);
  const showMessages = !!booking.cleaner_id && MESSAGE_ALLOWED.includes(booking.status);
  const showReviewPrompt = REVIEW_ALLOWED.includes(booking.status) && !hasReview;
  const showBookAgain = BOOK_AGAIN_ALLOWED.includes(booking.status);

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <StatusLive bookingId={booking.id} />

      {ACTIVE_MATCH.has(booking.status) && (
        <MatchingMap bookingId={booking.id} initial={matching} />
      )}

      {cancelled === "refunded" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Booking cancelled. Your deposit has been refunded to your original
          payment method (allow a few business days to appear).
        </div>
      )}
      {cancelled === "forfeit" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Booking cancelled. As this was within 24 hours of the appointment, the
          deposit was non-refundable per our cancellation policy.
        </div>
      )}
      {cancelled === "1" && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Booking cancelled.
        </div>
      )}

      {/* Status header */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Your booking</h1>
        <span
          className={`inline-block rounded-full px-4 py-1.5 text-sm font-medium ${STATUS_COLOR[booking.status] ?? "bg-slate-100 text-slate-700"}`}
        >
          {STATUS_LABEL[booking.status] ?? booking.status}
        </span>
      </div>

      {/* Booking details card */}
      <div className="card space-y-4">
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="h-5 w-5 text-accent" strokeWidth={1.5} />
            <span>When</span>
          </div>
          <span className="font-medium text-right">
            {new Date(booking.scheduled_at).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="h-5 w-5 text-accent" strokeWidth={1.5} />
            <span>Hours</span>
          </div>
          <span className="font-medium">{booking.hours}h</span>
        </div>
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="h-5 w-5 text-accent" strokeWidth={1.5} />
            <span>Area</span>
          </div>
          <span className="font-medium">{booking.area}</span>
        </div>
        {address?.full_address && (
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 text-slate-600">
              <Home className="h-5 w-5 text-accent" strokeWidth={1.5} />
              <span>Address</span>
            </div>
            <span className="font-medium text-right max-w-xs">
              {address.full_address}
            </span>
          </div>
        )}
      </div>

      {/* Cleaner card */}
      {cleaner && (
        <div className="card flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-dark shadow-elevation-md text-xl font-bold text-white">
            {cleaner.name?.charAt(0).toUpperCase() || "C"}
          </div>
          <div>
            <div className="font-semibold text-slate-900">
              {cleaner.name || "Your cleaner"}
            </div>
            {cleaner.id_verified && (
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="h-4 w-4 text-green-600" strokeWidth={2} />
                <span className="text-xs font-medium text-green-700">ID-verified</span>
              </div>
            )}
            <div className="flex items-center gap-1 mt-2 text-sm text-slate-600">
              <Star className="h-4 w-4 text-accent" strokeWidth={1.5} />
              <span>{cleaner.jobs_completed} jobs completed</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment card */}
      <div className="card space-y-4">
        <div className="border-b border-slate-200 pb-4">
          <div className="flex justify-between">
            <span className="text-slate-600">Total</span>
            <span className="text-2xl font-bold text-gradient">
              ${Number(booking.total_amount).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex justify-between rounded-lg bg-accent-light/10 border border-accent-light p-4">
          <span className="font-medium text-slate-900">Deposit (to confirm)</span>
          <span className="font-bold text-accent-dark">
            ${Number(booking.deposit_amount).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Balance (after the job)</span>
          <span className="font-medium">${Number(booking.balance_amount).toFixed(2)}</span>
        </div>
      </div>

      {/* Deposit pay */}
      {showDeposit && (
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm font-medium text-green-700 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>
              Pay the rest only after the cleaning is done to your satisfaction.
            </span>
          </div>
          <form
            action={async () => {
              "use server";
              await payDeposit(booking.id);
            }}
          >
            <button className="w-full btn-base btn-primary shadow-elevation-md">
              Pay ${Number(booking.deposit_amount).toFixed(2)} deposit securely
            </button>
          </form>
        </div>
      )}

      {/* Balance pay */}
      {showBalance && (
        <form
          action={async () => {
            "use server";
            await payBalance(booking.id);
          }}
        >
          <button className="w-full btn-base btn-primary shadow-elevation-md">
            Pay ${Number(booking.balance_amount).toFixed(2)} balance securely
          </button>
        </form>
      )}

      {(showDeposit || showBalance) && (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
          <Lock className="h-4 w-4" strokeWidth={1.5} />
          <span>Secured by Stripe. Need help? support@dustbusters.ca</span>
        </div>
      )}

      {/* Review prompt */}
      {showReviewPrompt && (
        <div className="card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Star className="h-6 w-6 text-accent" strokeWidth={1.5} />
            <div>
              <p className="font-semibold text-slate-900">How was your cleaning?</p>
              <p className="text-sm text-slate-500">Leave a review for your cleaner.</p>
            </div>
          </div>
          <Link
            href={`/bookings/${id}/review`}
            className="btn-base btn-primary whitespace-nowrap"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Review
          </Link>
        </div>
      )}

      {/* Messaging panel */}
      {showMessages && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <MessageSquare className="h-4 w-4 text-accent" strokeWidth={1.5} />
            <span>Chat with your cleaner</span>
          </div>
          <MessagePanel
            bookingId={booking.id}
            currentUserId={user.id}
            initialMessages={initialMessages}
          />
        </div>
      )}

      {/* Dispute / Report issue */}
      {showDispute && (
        <div className="card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
            <div>
              <p className="font-medium text-slate-900">Something wrong?</p>
              <p className="text-xs text-slate-500">Report an issue with this booking.</p>
            </div>
          </div>
          <Link
            href={`/bookings/${id}/dispute`}
            className="btn-base btn-secondary whitespace-nowrap text-sm"
          >
            Report Issue
          </Link>
        </div>
      )}

      {/* Cancel booking */}
      {showCancel && (
        <details className="card group">
          <summary className="flex cursor-pointer items-center gap-2 text-red-600 font-medium select-none list-none">
            <XCircle className="h-5 w-5" strokeWidth={1.5} />
            Cancel this booking
          </summary>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
              <strong>Cancellation policy:</strong> Cancellations made more than 24 hours before the scheduled time receive a full deposit refund. Cancellations within 24 hours may forfeit the deposit. Balance payments are never charged for cancelled bookings.
            </div>
            <form
              action={async (formData: FormData) => {
                "use server";
                const reason = (formData.get("reason") as string) || "Customer cancelled";
                await cancelBooking(booking.id, reason);
              }}
              className="space-y-3"
            >
              <textarea
                name="reason"
                placeholder="Optional: let us know why you're cancelling..."
                rows={3}
                maxLength={500}
                className="input-modern resize-none"
              />
              <button
                type="submit"
                className="w-full btn-base border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 font-semibold rounded-xl py-3"
              >
                Confirm Cancellation
              </button>
            </form>
          </div>
        </details>
      )}

      {/* Book again */}
      {showBookAgain && (
        <div className="card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-accent" strokeWidth={1.5} />
            <p className="font-medium text-slate-900">Need another clean?</p>
          </div>
          <Link
            href={`/book?hours=${booking.hours}&area=${encodeURIComponent(booking.area)}`}
            className="btn-base btn-primary whitespace-nowrap"
          >
            Book Again
          </Link>
        </div>
      )}
    </main>
  );
}
