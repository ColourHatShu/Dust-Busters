import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { acceptJob, declineJob, startJob, completeJob } from "../actions";
import JobsLive from "./JobsLive";
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

export default async function CleanerJobsPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "cleaner") redirect("/cleaner/onboard");

  const supabase = await createClient();

  // Open offers ringing right now
  const { data: offers } = await supabase
    .from("booking_offers")
    .select(
      "booking_id, state, bookings(id, status, scheduled_at, hours, area, total_amount, deposit_amount)"
    )
    .eq("cleaner_id", user.id)
    .eq("state", "rung");

  const openOffers = (offers ?? []).filter((o) => {
    const b = Array.isArray(o.bookings) ? o.bookings[0] : o.bookings;
    return b?.status === "broadcasting";
  });

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

  return (
    <main className="mx-auto max-w-2xl space-y-10 p-6">
      <JobsLive cleanerId={user.id} />

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
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-teal-700">
                        ${Number(b.total_amount).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400">gross</div>
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
          <div className="flex flex-col gap-4">
            {myJobs.map((b) => (
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
        )}
      </section>
    </main>
  );
}
