import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  acceptJob,
  declineJob,
  startJob,
  completeJob,
  setAvailability,
  addTimeOff,
  removeTimeOff,
} from "../actions";
import JobsLive from "./JobsLive";
import Countdown from "./Countdown";
import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";
import { bookingBadgeClass, bookingStatusLabel } from "@/lib/status";
import {
  MapPin,
  Clock,
  Calendar,
  DollarSign,
  MessageCircle,
  Home,
  CheckCircle,
  PlayCircle,
  AlertTriangle,
  AlertCircle,
  BellRing,
  Briefcase,
  CalendarOff,
  X,
} from "lucide-react";

const DEPOSIT_PAID_AND_LATER = new Set([
  "deposit_paid",
  "in_progress",
  "completed",
  "balance_paid",
  "closed",
]);

export default async function CleanerJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; actionError?: string }>;
}) {
  const { notice, actionError } = await searchParams;
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "cleaner") redirect("/cleaner/onboard");

  const supabase = await createClient();

  // Current availability (cleaner-controlled online/offline)
  const { data: cd } = await supabase
    .from("cleaner_details")
    .select("accepting_jobs")
    .eq("profile_id", user.id)
    .maybeSingle();
  const accepting = cd?.accepting_jobs ?? true;

  // Upcoming time off (dates the cleaner blocked) — Pacific "today" forward.
  const todayPacific = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const { data: timeOff } = await supabase
    .from("cleaner_time_off")
    .select("id, off_date")
    .eq("cleaner_id", user.id)
    .gte("off_date", todayPacific)
    .order("off_date", { ascending: true });
  const upcomingTimeOff = timeOff ?? [];

  // Open offers ringing right now
  const { data: offers } = await supabase
    .from("booking_offers")
    .select(
      "booking_id, state, bookings(id, status, scheduled_at, hours, area, total_amount, deposit_amount, cleaner_payout, broadcast_expires_at)"
    )
    .eq("cleaner_id", user.id)
    .eq("state", "rung");

  const broadcastingOffers = (offers ?? []).filter((o) => {
    const b = Array.isArray(o.bookings) ? o.bookings[0] : o.bookings;
    return b?.status === "broadcasting";
  });

  // Drop offers whose broadcast window has expired, and flip those abandoned
  // broadcasts to no_cleaner_found (the customer page does this too, but a
  // never-reopened booking would otherwise linger — close it from here as well).
  const nowMs = Date.now();
  const expiredBookingIds: string[] = [];
  const openOffers = broadcastingOffers.filter((o) => {
    const b = Array.isArray(o.bookings) ? o.bookings[0] : o.bookings;
    const exp = b?.broadcast_expires_at
      ? new Date(b.broadcast_expires_at).getTime()
      : null;
    if (exp !== null && exp < nowMs) {
      if (b?.id) expiredBookingIds.push(b.id);
      return false;
    }
    return true;
  });
  if (expiredBookingIds.length > 0) {
    await Promise.all(
      expiredBookingIds.map((bid) =>
        supabase.rpc("expire_booking_if_stale", { p_booking_id: bid }),
      ),
    );
  }

  // Also cancel this cleaner's accepted jobs whose deposit deadline passed
  // unpaid — frees their schedule (the accept conflict-guard treats 'accepted'
  // as committed) and reflects the cancellation in the list below. No-op unless
  // a deadline has actually passed.
  const { data: acceptedRows } = await supabase
    .from("bookings")
    .select("id")
    .eq("cleaner_id", user.id)
    .eq("status", "accepted");
  if (acceptedRows && acceptedRows.length > 0) {
    await Promise.all(
      acceptedRows.map((r) =>
        supabase.rpc("expire_unpaid_acceptance", { p_booking_id: r.id }),
      ),
    );
  }

  // Jobs this cleaner has won — join customer profile + address
  const { data: myJobsRaw } = await supabase
    .from("bookings")
    .select(
      `id, status, scheduled_at, hours, area, total_amount, deposit_amount,
       customer_id,
       profiles!bookings_customer_id_fkey(name),
       booking_addresses(full_address)`
    )
    .eq("cleaner_id", user.id)
    .in("status", [
      "accepted",
      "deposit_paid",
      "in_progress",
      "completed",
      "balance_paid",
      "closed",
    ])
    .order("scheduled_at", { ascending: true });

  type MyJob = {
    id: string;
    status: string;
    scheduled_at: string;
    hours: number;
    area: string;
    total_amount: number;
    deposit_amount: number;
    customer_id: string;
    customerName: string;
    address: string | null;
  };

  const myJobs: MyJob[] = (myJobsRaw ?? []).map((b) => {
    const profileData = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
    const addrData = Array.isArray(b.booking_addresses)
      ? b.booking_addresses[0]
      : b.booking_addresses;
    return {
      id: b.id,
      status: b.status,
      scheduled_at: b.scheduled_at,
      hours: b.hours,
      area: b.area,
      total_amount: b.total_amount,
      deposit_amount: b.deposit_amount,
      customer_id: b.customer_id,
      customerName:
        (profileData as { name: string } | null)?.name ?? "Customer",
      address: DEPOSIT_PAID_AND_LATER.has(b.status)
        ? (addrData as { full_address: string } | null)?.full_address ?? null
        : null,
    };
  });

  // Group won jobs by day so a cleaner can plan: Today / Upcoming / Earlier.
  const dayGroup = (iso: string): "Today" | "Upcoming" | "Earlier" => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
    const d = new Date(iso);
    if (d >= tomorrowStart) return "Upcoming";
    if (d >= todayStart) return "Today";
    return "Earlier";
  };
  const jobGroups: Record<"Today" | "Upcoming" | "Earlier", MyJob[]> = {
    Today: [],
    Upcoming: [],
    Earlier: [],
  };
  for (const j of myJobs) jobGroups[dayGroup(j.scheduled_at)].push(j);
  const jobGroupOrder = ["Today", "Upcoming", "Earlier"] as const;

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <JobsLive cleanerId={user.id} />

      {/* Availability toggle (online / offline) */}
      <div
        className={`card card-sm flex flex-wrap items-center justify-between gap-4${
          accepting ? " card-accent" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`relative flex h-2.5 w-2.5 rounded-full ${
              accepting ? "bg-emerald-500" : "bg-slate-400"
            }`}
          >
            {accepting && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
          </span>
          <div>
            <p className="font-semibold text-slate-900">
              {accepting ? "Online" : "Offline"}
            </p>
            <p className="text-xs text-slate-500">
              {accepting
                ? "Receiving new job requests"
                : "Paused — not receiving new requests"}
            </p>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await setAvailability(!accepting);
          }}
        >
          <button className="btn-base btn-secondary text-sm">
            {accepting ? "Go offline" : "Go online"}
          </button>
        </form>
      </div>

      {/* Time off — block dates you're unavailable */}
      <div className="card card-sm space-y-4">
        <div className="flex items-center gap-3">
          <span className="icon-tile icon-tile-sm icon-tile-soft">
            <CalendarOff className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-slate-900">Time off</p>
            <p className="text-xs text-slate-500">
              Block days you&apos;re away — you won&apos;t be sent requests for
              those dates.
            </p>
          </div>
        </div>

        <form action={addTimeOff} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1.5">
            <span className="form-label">Add a date</span>
            <input
              type="date"
              name="off_date"
              required
              min={todayPacific}
              className="input-modern"
              aria-label="Date off"
            />
          </label>
          <button className="btn-base btn-secondary text-sm">Add</button>
        </form>

        {upcomingTimeOff.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {upcomingTimeOff.map((t) => {
              const [y, m, d] = t.off_date.split("-").map(Number);
              const label = new Date(y, m - 1, d).toLocaleDateString("en-CA", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              return (
                <span
                  key={t.id}
                  className="badge badge-neutral inline-flex items-center gap-1.5"
                >
                  {label}
                  <form action={removeTimeOff.bind(null, t.id)}>
                    <button
                      type="submit"
                      aria-label={`Remove ${label}`}
                      className="-mr-1 rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    </button>
                  </form>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No upcoming time off scheduled.</p>
        )}
      </div>

      {notice === "conflict" && (
        <div className="alert alert-warning">
          <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
          <span>
            That job overlaps with another job you&apos;ve already accepted.
            Finish or free up that time slot before taking this one.
          </span>
        </div>
      )}
      {notice === "won" && (
        <div className="alert alert-success">
          <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
          <span>
            You got the job! It&apos;s now in your jobs below — we&apos;ll let you
            know once the customer pays the deposit.
          </span>
        </div>
      )}
      {notice === "lost" && (
        <div className="alert alert-info">
          <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
          <span>
            Another cleaner accepted that job first. Keep an eye out — new offers
            appear here in real time.
          </span>
        </div>
      )}
      {actionError && (
        <div className="alert alert-error">
          <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Open Offers */}
      <section className="space-y-4">
        <header>
          <h1 className="page-title">Job requests</h1>
          <p className="page-subtitle">
            New requests appear here in real time. Accept within the offer
            window!
          </p>
        </header>

        {openOffers.length === 0 ? (
          <div className="card card-flush">
            <div className="empty-state">
              <span className="empty-state-icon">
                <BellRing className="h-6 w-6" strokeWidth={1.5} />
              </span>
              <p className="empty-state-title">No open requests right now</p>
              <p className="empty-state-text">
                New jobs will appear here instantly.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {openOffers.map((o) => {
              const b = Array.isArray(o.bookings) ? o.bookings[0] : o.bookings;
              if (!b) return null;
              return (
                <div key={o.booking_id} className="card card-accent space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">
                        {b.area}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar
                            className="h-4 w-4 text-slate-400"
                            strokeWidth={1.5}
                          />
                          {new Date(b.scheduled_at).toLocaleString()}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock
                            className="h-4 w-4 text-slate-400"
                            strokeWidth={1.5}
                          />
                          {b.hours}h
                        </span>
                      </div>
                      <div className="mt-2">
                        <Countdown expiresAt={b.broadcast_expires_at ?? null} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xl font-bold tabular-nums text-emerald-700">
                        ${Number(b.cleaner_payout ?? b.total_amount).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400">your take-home</div>
                      <div className="mt-0.5 text-xs tabular-nums text-slate-400">
                        ${Number(b.total_amount).toFixed(2)} total
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form
                      action={async () => {
                        "use server";
                        await acceptJob(b.id);
                      }}
                    >
                      <SubmitButton
                        className="btn-base btn-primary flex items-center gap-1.5 text-sm"
                        pendingText="Accepting…"
                      >
                        <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                        Accept
                      </SubmitButton>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await declineJob(b.id);
                      }}
                    >
                      <SubmitButton
                        className="btn-base btn-secondary text-sm"
                        pendingText="Declining…"
                      >
                        Decline
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* My Jobs */}
      <section className="space-y-5">
        <h2 className="section-title">My jobs</h2>
        {myJobs.length === 0 ? (
          <div className="card card-flush">
            <div className="empty-state">
              <span className="empty-state-icon">
                <Briefcase className="h-6 w-6" strokeWidth={1.5} />
              </span>
              <p className="empty-state-title">No jobs yet</p>
              <p className="empty-state-text">
                Accept an offer above to get started!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {jobGroupOrder.map((g) =>
              jobGroups[g].length === 0 ? null : (
                <div key={g} className="space-y-3">
                  <h3 className="eyebrow-label">
                    {g} ({jobGroups[g].length})
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {jobGroups[g].map((b) => {
                      const initial =
                        b.customerName.trim().charAt(0).toUpperCase() || "C";
                      return (
                        <div key={b.id} className="card space-y-4">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="avatar h-10 w-10 text-sm">
                                {initial}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900">
                                  {b.area}
                                </div>
                                <div className="text-sm text-slate-500">
                                  for {b.customerName}
                                </div>
                              </div>
                            </div>
                            <span className={bookingBadgeClass(b.status)}>
                              {bookingStatusLabel(b.status)}
                            </span>
                          </div>

                          {/* Details row */}
                          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <Calendar
                                className="h-4 w-4 text-slate-400"
                                strokeWidth={1.5}
                              />
                              {new Date(b.scheduled_at).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock
                                className="h-4 w-4 text-slate-400"
                                strokeWidth={1.5}
                              />
                              {b.hours}h
                            </span>
                            <span className="flex items-center gap-1.5 tabular-nums">
                              <DollarSign
                                className="h-4 w-4 text-slate-400"
                                strokeWidth={1.5}
                              />
                              ${Number(b.total_amount).toFixed(2)}
                            </span>
                          </div>

                          {/* Address (shown when deposit_paid or later) */}
                          {b.address && (
                            <div className="alert alert-success">
                              <Home className="h-4 w-4" strokeWidth={1.5} />
                              <span>{b.address}</span>
                            </div>
                          )}

                          {/* Actions row */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {b.status === "deposit_paid" && (
                              <form
                                action={async () => {
                                  "use server";
                                  await startJob(b.id);
                                }}
                              >
                                <SubmitButton
                                  className="btn-base btn-primary flex items-center gap-1.5 text-sm"
                                  pendingText="Starting…"
                                >
                                  <PlayCircle
                                    className="h-4 w-4"
                                    strokeWidth={1.5}
                                  />
                                  Start job
                                </SubmitButton>
                              </form>
                            )}
                            {b.status === "in_progress" && (
                              <form
                                action={async () => {
                                  "use server";
                                  await completeJob(b.id);
                                }}
                              >
                                <SubmitButton
                                  className="btn-base btn-primary flex items-center gap-1.5 text-sm"
                                  pendingText="Completing…"
                                >
                                  <CheckCircle
                                    className="h-4 w-4"
                                    strokeWidth={1.5}
                                  />
                                  Mark complete
                                </SubmitButton>
                              </form>
                            )}
                            <Link
                              href={`/cleaner/jobs/${b.id}`}
                              className="btn-base btn-secondary flex items-center gap-1.5 text-sm"
                            >
                              <MessageCircle
                                className="h-4 w-4"
                                strokeWidth={1.5}
                              />
                              Message customer
                            </Link>
                            <Link
                              href={`/cleaner/jobs/${b.id}`}
                              className="link-subtle inline-flex items-center gap-1.5 text-sm"
                            >
                              <MapPin className="h-4 w-4" strokeWidth={1.5} />
                              View details
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </main>
  );
}
