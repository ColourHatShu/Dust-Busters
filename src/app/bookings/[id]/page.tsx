import { redirect, notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StatusLive from "./StatusLive";
import MessagePanel from "./MessagePanel";
import { payDeposit, payBalance } from "./payment-actions";
import SubmitButton from "@/components/SubmitButton";
import { cancelBooking } from "./cancel-actions";
import MatchingMap, { type MatchingData } from "./matching/MatchingMap";
import { toggleFavorite } from "./favorite-actions";
import { bookingBadgeClass, bookingStatusLabel, paymentBadgeClass } from "@/lib/status";
import { STATUS_LABEL } from "@/lib/types";
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
  Receipt,
  Heart,
  Pencil,
  ShieldCheck,
  Info,
} from "lucide-react";
import Link from "next/link";

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
  searchParams: Promise<{
    cancelled?: string;
    payError?: string;
    reviewError?: string;
    cancelError?: string;
    disputeError?: string;
  }>;
}) {
  const { id } = await params;
  const { cancelled, payError, reviewError, cancelError, disputeError } =
    await searchParams;
  const actionError = payError || reviewError || cancelError || disputeError;
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  // Self-healing timeout: flip a broadcast that's past its window to
  // no_cleaner_found before we read it (no cron needed).
  await supabase.rpc("expire_booking_if_stale", { p_booking_id: id });
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

  // Payment history / receipt (RLS scopes this to the customer's own booking).
  const { data: payments } = await supabase
    .from("payments")
    .select("id, type, amount, status, paid_at, created_at")
    .eq("booking_id", id)
    .order("created_at", { ascending: true })
    .returns<
      {
        id: string;
        type: string;
        amount: number;
        status: string;
        paid_at: string | null;
        created_at: string;
      }[]
    >();
  const paymentRows = payments ?? [];
  // A refund is recorded twice: the original deposit row flips to status
  // "refunded" (so it already drops from a "paid" sum) AND a separate negative
  // "refund" row is inserted for the receipt line. Counting that negative row
  // here too would subtract the refund a second time → a negative total. Exclude
  // refund rows from the aggregate (they still render in the list below). A
  // refunded deposit therefore nets to $0.00.
  const netPaid = paymentRows
    .filter((p) => p.status === "paid" && p.type !== "refund")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  let cleaner: { name: string; id_verified: boolean; jobs_completed: number } | null =
    null;
  let isFavorite = false;
  if (booking.cleaner_id) {
    const { data } = await supabase.rpc("get_cleaner_card", {
      p_cleaner: booking.cleaner_id,
    });
    cleaner = Array.isArray(data) ? data[0] : data;

    const { data: fav } = await supabase
      .from("customer_favorites")
      .select("cleaner_id")
      .eq("customer_id", user.id)
      .eq("cleaner_id", booking.cleaner_id)
      .maybeSingle();
    isFavorite = !!fav;
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
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <StatusLive bookingId={booking.id} />

      {ACTIVE_MATCH.has(booking.status) && (
        <MatchingMap bookingId={booking.id} initial={matching} />
      )}

      {actionError && (
        <div className="alert alert-error">
          <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
          <span>{actionError}</span>
        </div>
      )}
      {cancelled === "refunded" && (
        <div className="alert alert-success">
          <CheckCircle className="h-5 w-5" strokeWidth={1.5} />
          <span>
            Booking cancelled. Your deposit has been refunded to your original
            payment method (allow a few business days to appear).
          </span>
        </div>
      )}
      {cancelled === "forfeit" && (
        <div className="alert alert-warning">
          <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
          <span>
            Booking cancelled. As this was within 24 hours of the appointment, the
            deposit was non-refundable per our cancellation policy.
          </span>
        </div>
      )}
      {cancelled === "1" && (
        <div className="alert alert-info">
          <Info className="h-5 w-5" strokeWidth={1.5} />
          <span>Booking cancelled.</span>
        </div>
      )}

      {/* Status header */}
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="page-title">Your booking</h1>
          <span className={bookingBadgeClass(booking.status)}>
            {bookingStatusLabel(booking.status)}
          </span>
        </div>
        <p className="page-subtitle">
          {STATUS_LABEL[booking.status as keyof typeof STATUS_LABEL] ??
            booking.status}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* MAIN: informational blocks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking details card */}
          <div className="card">
            <div className="detail-row">
              <span className="detail-label">
                <Calendar className="h-4 w-4 text-accent" strokeWidth={1.75} />
                When
              </span>
              <span className="detail-value">
                {new Date(booking.scheduled_at).toLocaleString()}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">
                <Clock className="h-4 w-4 text-accent" strokeWidth={1.75} />
                Hours
              </span>
              <span className="detail-value">{booking.hours}h</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">
                <MapPin className="h-4 w-4 text-accent" strokeWidth={1.75} />
                Area
              </span>
              <span className="detail-value">{booking.area}</span>
            </div>
            {address?.full_address && (
              <div className="detail-row">
                <span className="detail-label">
                  <Home className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  Address
                </span>
                <span className="detail-value max-w-xs">
                  {address.full_address}
                </span>
              </div>
            )}
          </div>

          {/* Payment card */}
          <div className="card">
            <div className="detail-row">
              <span className="text-sm font-semibold text-slate-700">Total</span>
              <span className="amount-lg text-gradient">
                ${Number(booking.total_amount).toFixed(2)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Deposit (to confirm)</span>
              <span className="detail-value text-accent-dark">
                ${Number(booking.deposit_amount).toFixed(2)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Balance (after the job)</span>
              <span className="detail-value">
                ${Number(booking.balance_amount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment receipt */}
          {paymentRows.length > 0 && (
            <section className="card space-y-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-accent" strokeWidth={1.75} />
                <h2 className="section-title">Payments</h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {paymentRows.map((p) => {
                  const label =
                    p.type === "deposit"
                      ? "Deposit"
                      : p.type === "balance"
                        ? "Balance"
                        : p.type === "refund"
                          ? "Refund"
                          : p.type;
                  const when = p.paid_at ?? p.created_at;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{label}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {new Date(when).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`${paymentBadgeClass(p.status)} capitalize`}>
                          {p.status}
                        </span>
                        <span
                          className={`text-sm font-semibold tabular-nums ${
                            Number(p.amount) < 0 ? "text-amber-600" : "text-slate-900"
                          }`}
                        >
                          {Number(p.amount) < 0 ? "−" : ""}$
                          {Math.abs(Number(p.amount)).toFixed(2)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-medium text-slate-600">Net paid</span>
                <span className="amount-lg">${netPaid.toFixed(2)}</span>
              </div>
            </section>
          )}

          {/* Cancel booking */}
          {showCancel && (
            <details className="card group">
              <summary className="flex cursor-pointer items-center gap-2 text-red-600 font-medium select-none list-none">
                <XCircle className="h-5 w-5" strokeWidth={1.5} />
                Cancel this booking
              </summary>
              <div className="mt-4 space-y-4">
                <div className="alert alert-warning">
                  <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
                  <span>
                    <strong>Cancellation policy:</strong> Cancellations made more than 24 hours before the scheduled time receive a full deposit refund. Cancellations within 24 hours may forfeit the deposit. Balance payments are never charged for cancelled bookings.
                  </span>
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
                <span className="icon-tile icon-tile-soft icon-tile-sm">
                  <RefreshCw className="h-5 w-5" strokeWidth={1.75} />
                </span>
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
        </div>

        {/* SIDEBAR: cleaner, actions, review, dispute, chat */}
        <aside className="space-y-6">
          {/* Cleaner card */}
          {cleaner && (
            <div className="card flex items-center gap-4">
              <div className="avatar h-16 w-16 text-xl">
                {cleaner.name?.charAt(0).toUpperCase() || "C"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900">
                  {cleaner.name || "Your cleaner"}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {cleaner.id_verified && (
                    <span className="badge badge-success">
                      <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
                      ID-verified
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-sm text-slate-600">
                    <Star className="h-4 w-4 text-accent" strokeWidth={1.75} />
                    {cleaner.jobs_completed} jobs completed
                  </span>
                </div>
              </div>
              {booking.cleaner_id && (
                <form
                  action={toggleFavorite.bind(
                    null,
                    id,
                    booking.cleaner_id,
                    isFavorite,
                  )}
                >
                  <button
                    type="submit"
                    aria-label={
                      isFavorite ? "Remove from favorites" : "Add to favorites"
                    }
                    aria-pressed={isFavorite}
                    className="rounded-full p-2 transition hover:bg-slate-100"
                  >
                    <Heart
                      className={`h-6 w-6 ${
                        isFavorite
                          ? "fill-rose-500 text-rose-500"
                          : "text-slate-300 hover:text-rose-400"
                      }`}
                      strokeWidth={1.75}
                    />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Deposit pay */}
          {showDeposit && (
            <div className="space-y-4">
              <div className="alert alert-success">
                <CheckCircle className="h-5 w-5" strokeWidth={1.5} />
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
                <SubmitButton
                  className="w-full btn-base btn-primary shadow-elevation-md"
                  pendingText="Redirecting to secure checkout…"
                >
                  Pay ${Number(booking.deposit_amount).toFixed(2)} deposit securely
                </SubmitButton>
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
              <SubmitButton
                className="w-full btn-base btn-primary shadow-elevation-md"
                pendingText="Redirecting to secure checkout…"
              >
                Pay ${Number(booking.balance_amount).toFixed(2)} balance securely
              </SubmitButton>
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
                <span className="icon-tile icon-tile-soft icon-tile-sm">
                  <Star className="h-5 w-5" strokeWidth={1.75} />
                </span>
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

          {/* Dispute / Report issue */}
          {showDispute && (
            <div className="card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="icon-tile icon-tile-warn icon-tile-sm">
                  <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
                </span>
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

          {/* Messaging panel */}
          {showMessages && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-accent" strokeWidth={1.75} />
                <h2 className="section-title">Chat with your cleaner</h2>
              </div>
              <MessagePanel
                bookingId={booking.id}
                currentUserId={user.id}
                initialMessages={initialMessages}
              />
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
