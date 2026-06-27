import { redirect, notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StatusLive from "./StatusLive";
import MessagePanel from "./MessagePanel";
import { payDeposit, payBalance } from "./payment-actions";
import { cancelBooking } from "./cancel-actions";
import MatchingMap, { type MatchingData } from "./matching/MatchingMap";
import { toggleFavorite } from "./favorite-actions";
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
  ChevronDown,
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

// Dark-theme status tones (border / glass fill / light text) for the status hero.
const STATUS_COLOR: Record<string, string> = {
  broadcasting: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  accepted: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  deposit_paid: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  in_progress: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  completed: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  balance_paid: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  closed: "border-slate-400/25 bg-slate-500/10 text-slate-300",
  cancelled: "border-red-400/30 bg-red-500/10 text-red-300",
  no_cleaner_found: "border-red-400/30 bg-red-500/10 text-red-300",
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
  const netPaid = paymentRows
    .filter((p) => p.status === "paid")
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
  // Presentational: pulse the status dot while a job is live/being matched.
  const liveStatus =
    booking.status === "broadcasting" || booking.status === "in_progress";

  return (
    <main className="app-shell">
      <div className="relative mx-auto max-w-xl px-6 py-10">
        <span
          aria-hidden="true"
          className="section-glow section-glow--teal absolute -top-6 right-0 h-64 w-64"
        />
        <span
          aria-hidden="true"
          className="section-glow section-glow--sky absolute left-[-5rem] top-72 h-64 w-64"
        />

        <div className="relative z-10 space-y-6">
          <StatusLive bookingId={booking.id} />

          {ACTIVE_MATCH.has(booking.status) && (
            <div className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)]">
              <MatchingMap bookingId={booking.id} initial={matching} />
            </div>
          )}

          {actionError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-300"
                strokeWidth={1.5}
              />
              <span>{actionError}</span>
            </div>
          )}
          {cancelled === "refunded" && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <CheckCircle
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300"
                strokeWidth={1.5}
              />
              <span>
                Booking cancelled. Your deposit has been refunded to your original
                payment method (allow a few business days to appear).
              </span>
            </div>
          )}
          {cancelled === "forfeit" && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300"
                strokeWidth={1.5}
              />
              <span>
                Booking cancelled. As this was within 24 hours of the appointment,
                the deposit was non-refundable per our cancellation policy.
              </span>
            </div>
          )}
          {cancelled === "1" && (
            <div className="surface-muted text-sm text-dim">Booking cancelled.</div>
          )}

          {/* Status header */}
          <header className="space-y-4">
            <span className="page-eyebrow">Booking status</span>
            <h1 className="page-title text-gradient-on-dark">Your booking</h1>
            <div
              className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm font-medium ${STATUS_COLOR[booking.status] ?? "border-slate-400/25 bg-slate-500/10 text-slate-300"}`}
            >
              <span className="relative flex h-2 w-2">
                {liveStatus && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
              </span>
              {STATUS_LABEL[booking.status] ?? booking.status}
            </div>
          </header>

          {/* Booking details card */}
          <section className="surface-card">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-teal-300/80">
              Appointment
            </h2>
            <div className="divide-y divide-white/5">
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-2.5 text-sm text-dim">
                  <Calendar className="h-5 w-5 text-teal-300" strokeWidth={1.5} />
                  <span>When</span>
                </div>
                <span className="text-right text-sm font-medium text-slate-100">
                  {new Date(booking.scheduled_at).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-2.5 text-sm text-dim">
                  <Clock className="h-5 w-5 text-teal-300" strokeWidth={1.5} />
                  <span>Hours</span>
                </div>
                <span className="text-sm font-medium text-slate-100">
                  {booking.hours}h
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-2.5 text-sm text-dim">
                  <MapPin className="h-5 w-5 text-teal-300" strokeWidth={1.5} />
                  <span>Area</span>
                </div>
                <span className="text-sm font-medium text-slate-100">
                  {booking.area}
                </span>
              </div>
              {address?.full_address && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <div className="flex items-center gap-2.5 text-sm text-dim">
                    <Home className="h-5 w-5 text-teal-300" strokeWidth={1.5} />
                    <span>Address</span>
                  </div>
                  <span className="max-w-xs text-right text-sm font-medium text-slate-100">
                    {address.full_address}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Cleaner card */}
          {cleaner && (
            <section className="surface-card flex items-center gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/15">
                {cleaner.name?.charAt(0).toUpperCase() || "C"}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-100">
                  {cleaner.name || "Your cleaner"}
                </div>
                {cleaner.id_verified && (
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-300" strokeWidth={2} />
                    <span className="text-xs font-medium text-emerald-300">ID-verified</span>
                  </div>
                )}
                <div className="mt-2 flex items-center gap-1.5 text-sm text-dim">
                  <Star className="h-4 w-4 text-teal-300" strokeWidth={1.5} />
                  <span>{cleaner.jobs_completed} jobs completed</span>
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
                    className="focus-ring rounded-full p-2 transition hover:bg-white/10"
                  >
                    <Heart
                      className={`h-6 w-6 transition ${
                        isFavorite
                          ? "fill-rose-500 text-rose-500"
                          : "text-slate-500 hover:text-rose-400"
                      }`}
                      strokeWidth={1.75}
                    />
                  </button>
                </form>
              )}
            </section>
          )}

          {/* Payment card */}
          <section className="surface-card space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300/80">
              Payment
            </h2>
            <div className="flex items-end justify-between border-b border-white/10 pb-4">
              <span className="text-sm text-dim">Total</span>
              <span className="text-3xl font-bold text-gradient-on-dark">
                ${Number(booking.total_amount).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4">
              <span className="text-sm font-medium text-slate-100">
                Deposit (to confirm)
              </span>
              <span className="font-bold text-emerald-300">
                ${Number(booking.deposit_amount).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-dim">
              <span>Balance (after the job)</span>
              <span className="font-medium text-slate-200">
                ${Number(booking.balance_amount).toFixed(2)}
              </span>
            </div>
          </section>

          {/* Deposit pay */}
          {showDeposit && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-200">
                <CheckCircle
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300"
                  strokeWidth={1.5}
                />
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
                <button className="btn-base btn-glow w-full">
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
              <button className="btn-base btn-glow w-full">
                Pay ${Number(booking.balance_amount).toFixed(2)} balance securely
              </button>
            </form>
          )}

          {(showDeposit || showBalance) && (
            <div className="flex items-center justify-center gap-2 text-xs text-faint">
              <Lock className="h-4 w-4" strokeWidth={1.5} />
              <span>Secured by Stripe. Need help? support@dustbusters.ca</span>
            </div>
          )}

          {/* Review prompt */}
          {showReviewPrompt && (
            <section className="surface-card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-teal-400/25 bg-teal-500/10 text-teal-300">
                  <Star className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-slate-100">How was your cleaning?</p>
                  <p className="text-sm text-dim">Leave a review for your cleaner.</p>
                </div>
              </div>
              <Link
                href={`/bookings/${id}/review`}
                className="btn-base btn-glow whitespace-nowrap"
              >
                <Pencil className="mr-1 h-4 w-4" />
                Review
              </Link>
            </section>
          )}

          {/* Messaging panel */}
          {showMessages && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <MessageSquare className="h-4 w-4 text-teal-300" strokeWidth={1.5} />
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
            <section className="surface-card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-500/10 text-amber-300">
                  <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium text-slate-100">Something wrong?</p>
                  <p className="text-xs text-dim">Report an issue with this booking.</p>
                </div>
              </div>
              <Link
                href={`/bookings/${id}/dispute`}
                className="btn-base btn-outline whitespace-nowrap text-sm"
              >
                Report Issue
              </Link>
            </section>
          )}

          {/* Cancel booking */}
          {showCancel && (
            <details className="surface-card group">
              <summary className="flex cursor-pointer select-none list-none items-center gap-2 font-medium text-red-300 transition hover:text-red-200">
                <XCircle className="h-5 w-5" strokeWidth={1.5} />
                Cancel this booking
                <ChevronDown
                  className="ml-auto h-4 w-4 text-slate-500 transition group-open:rotate-180"
                  strokeWidth={1.5}
                />
              </summary>
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
                  <strong className="font-semibold text-red-100">Cancellation policy:</strong> Cancellations made more than 24 hours before the scheduled time receive a full deposit refund. Cancellations within 24 hours may forfeit the deposit. Balance payments are never charged for cancelled bookings.
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
                    className="input-dark resize-none"
                  />
                  <button
                    type="submit"
                    className="btn-base w-full rounded-xl border border-red-500/30 bg-red-500/10 py-3 font-semibold text-red-300 transition hover:bg-red-500/20"
                  >
                    Confirm Cancellation
                  </button>
                </form>
              </div>
            </details>
          )}

          {/* Payment receipt */}
          {paymentRows.length > 0 && (
            <section className="surface-card space-y-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-teal-300" strokeWidth={1.5} />
                <h2 className="text-base font-semibold text-slate-100">Payments</h2>
              </div>
              <ul className="divide-y divide-white/5">
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
                    <li key={p.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-200">{label}</p>
                        <p className="text-xs text-faint">
                          {new Date(when).toLocaleDateString()} ·{" "}
                          <span className="capitalize">{p.status}</span>
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          Number(p.amount) < 0 ? "text-amber-400" : "text-slate-100"
                        }`}
                      >
                        {Number(p.amount) < 0 ? "−" : ""}$
                        {Math.abs(Number(p.amount)).toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-sm font-medium text-dim">Net paid</span>
                <span className="text-base font-bold text-slate-100">
                  ${netPaid.toFixed(2)}
                </span>
              </div>
            </section>
          )}

          {/* Book again */}
          {showBookAgain && (
            <section className="surface-card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-teal-400/25 bg-teal-500/10 text-teal-300">
                  <RefreshCw className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <p className="font-medium text-slate-100">Need another clean?</p>
              </div>
              <Link
                href={`/book?hours=${booking.hours}&area=${encodeURIComponent(booking.area)}`}
                className="btn-base btn-glow whitespace-nowrap"
              >
                Book Again
              </Link>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
