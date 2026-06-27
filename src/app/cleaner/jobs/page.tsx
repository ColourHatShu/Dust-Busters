import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  acceptJob,
  declineJob,
  startJob,
  completeJob,
  setAvailability,
} from "../actions";
import JobsLive from "./JobsLive";
import Countdown from "./Countdown";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Calendar,
  DollarSign,
  MessageCircle,
  Home,
  CheckCircle,
  PlayCircle,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  accepted: "Cleaner assigned",
  deposit_paid: "Deposit paid – ready to start",
  in_progress: "In progress",
  completed: "Completed",
};

const STATUS_COLOR: Record<string, string> = {
  accepted: "bg-yellow-100 text-yellow-700",
  deposit_paid: "bg-green-100 text-green-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-blue-100 text-blue-700",
};

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
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
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
    .in("status", ["accepted", "deposit_paid", "in_progress", "completed"])
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
    <main className="mx-auto max-w-2xl space-y-10 p-6">
      <JobsLive cleanerId={user.id} />

      {/* Availability toggle (online / offline) */}
      <div
        className={`flex items-center justify-between rounded-xl border p-4 ${
          accepting
            ? "border-emerald-200 bg-emerald-50"
            : "border-slate-200 bg-slate-50"
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
            <p className="font-medium text-slate-900">
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

      {notice === "conflict" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          That job overlaps with another job you&apos;ve already accepted. Finish or
          free up that time slot before taking this one.
        </div>
      )}

      {/* Open Offers */}
      <section>
        <h1 className="mb-1 text-2xl font-bold text-slate-900">Job requests</h1>
        <p className="mb-4 text-sm text-slate-500">
          New requests appear here in real time. Accept within the offer window!
        </p>

        {openOffers.length === 0 ? (
          <div className="card text-center text-sm text-slate-400">
            No open requests right now. New jobs will appear here instantly.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {openOffers.map((o) => {
              const b = Array.isArray(o.bookings) ? o.bookings[0] : o.bookings;
              if (!b) return null;
              return (
                <div
                  key={o.booking_id}
                  className="card border-l-4 border-l-teal-500"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {b.area}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {b.hours}h
                        <span className="mx-1">&middot;</span>
                        <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {new Date(b.scheduled_at).toLocaleString()}
                      </div>
                      <div className="mt-2">
                        <Countdown expiresAt={b.broadcast_expires_at ?? null} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-teal-700">
                        ${Number(b.cleaner_payout ?? b.total_amount).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400">your take-home</div>
                      <div className="mt-0.5 text-xs text-slate-400">
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
                      <button className="btn-base btn-primary flex items-center gap-1.5 text-sm">
                        <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                        Accept
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await declineJob(b.id);
                      }}
                    >
                      <button className="btn-base btn-secondary text-sm">
                        Decline
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* My Jobs */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900">My jobs</h2>
        {myJobs.length === 0 ? (
          <div className="card text-center text-sm text-slate-400">
            No jobs yet. Accept an offer above to get started!
          </div>
        ) : (
          <div className="space-y-6">
            {jobGroupOrder.map((g) =>
              jobGroups[g].length === 0 ? null : (
                <div key={g} className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {g} ({jobGroups[g].length})
                  </h3>
                  <div className="flex flex-col gap-4">
                    {jobGroups[g].map((b) => (
                      <div key={b.id} className="card space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">{b.area}</div>
                    <div className="mt-0.5 text-sm text-slate-500">
                      for {b.customerName}
                    </div>
                  </div>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                      STATUS_COLOR[b.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </div>

                {/* Details row */}
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                    {new Date(b.scheduled_at).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                    {b.hours}h
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                    ${Number(b.total_amount).toFixed(2)}
                  </span>
                </div>

                {/* Address (shown when deposit_paid or later) */}
                {b.address && (
                  <div className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                    <Home
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600"
                      strokeWidth={1.5}
                    />
                    <span>{b.address}</span>
                  </div>
                )}

                {/* Actions row */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {b.status === "deposit_paid" && (
                    <form
                      action={async () => {
                        "use server";
                        await startJob(b.id);
                      }}
                    >
                      <button className="btn-base btn-primary flex items-center gap-1.5 text-sm">
                        <PlayCircle className="h-4 w-4" strokeWidth={1.5} />
                        Start job
                      </button>
                    </form>
                  )}
                  {b.status === "in_progress" && (
                    <form
                      action={async () => {
                        "use server";
                        await completeJob(b.id);
                      }}
                    >
                      <button className="btn-base btn-primary flex items-center gap-1.5 text-sm">
                        <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                        Mark complete
                      </button>
                    </form>
                  )}
                  <Link
                    href={`/cleaner/jobs/${b.id}`}
                    className="btn-base btn-secondary flex items-center gap-1.5 text-sm"
                  >
                    <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                    Message customer
                  </Link>
                  <Link
                    href={`/cleaner/jobs/${b.id}`}
                    className="flex items-center gap-1.5 text-sm text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
                  >
                    <MapPin className="h-4 w-4" strokeWidth={1.5} />
                    View details
                  </Link>
                </div>
                      </div>
                    ))}
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
