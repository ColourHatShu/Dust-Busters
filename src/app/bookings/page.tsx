import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Calendar, Clock, ChevronRight, Sparkles } from "lucide-react";

type Booking = {
  id: string;
  status: string;
  area: string;
  scheduled_at: string;
  hours: number;
  total_amount: number;
};

const STATUS_COLOR: Record<string, string> = {
  broadcasting: "bg-blue-100 text-blue-700",
  accepted: "bg-yellow-100 text-yellow-700",
  deposit_paid: "bg-green-100 text-green-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-orange-100 text-orange-700",
  balance_paid: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  no_cleaner_found: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  broadcasting: "Finding cleaner",
  accepted: "Awaiting deposit",
  deposit_paid: "Confirmed",
  in_progress: "In progress",
  completed: "Awaiting payment",
  balance_paid: "Paid in full",
  closed: "Closed",
  cancelled: "Cancelled",
  no_cleaner_found: "No cleaner found",
};

const ACTIVE_STATUSES = new Set([
  "broadcasting",
  "accepted",
  "deposit_paid",
  "in_progress",
  "completed",
]);

const COMPLETED_STATUSES = new Set([
  "balance_paid",
  "closed",
  "cancelled",
  "no_cleaner_found",
]);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "active" ? "active" : tab === "completed" ? "completed" : "all";

  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, status, area, scheduled_at, hours, total_amount")
    .order("created_at", { ascending: false });

  const all = (data ?? []) as Booking[];

  const filtered =
    activeTab === "active"
      ? all.filter((b) => ACTIVE_STATUSES.has(b.status))
      : activeTab === "completed"
        ? all.filter((b) => COMPLETED_STATUSES.has(b.status))
        : all;

  const tabs = [
    { key: "all", label: "All", count: all.length },
    {
      key: "active",
      label: "Active",
      count: all.filter((b) => ACTIVE_STATUSES.has(b.status)).length,
    },
    {
      key: "completed",
      label: "Completed",
      count: all.filter((b) => COMPLETED_STATUSES.has(b.status)).length,
    },
  ];

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
        <Link href="/book" className="btn-base btn-primary text-sm px-4 py-2">
          + New booking
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/bookings?tab=${t.key}`}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-all ${
              activeTab === t.key
                ? "bg-white shadow text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  activeTab === t.key
                    ? "bg-accent text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {t.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Booking list */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-light/20">
            <Sparkles className="h-8 w-8 text-accent" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-semibold text-slate-700 mb-1">
              {activeTab === "all" ? "No bookings yet" : `No ${activeTab} bookings`}
            </p>
            <p className="text-sm text-slate-400">
              {activeTab === "all"
                ? "Your bookings will appear here once you book a cleaning."
                : "Nothing to show for this filter."}
            </p>
          </div>
          {activeTab === "all" && (
            <Link href="/book" className="btn-base btn-primary">
              Book a cleaning
            </Link>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((b) => (
            <li key={b.id}>
              <Link
                href={`/bookings/${b.id}`}
                className="card flex items-center justify-between gap-4 hover:shadow-elevation-md transition-shadow p-4 group"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{b.area}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLOR[b.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {formatDate(b.scheduled_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {formatTime(b.scheduled_at)} &middot; {b.hours}h
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-lg font-bold text-gradient">
                    ${Number(b.total_amount).toFixed(2)}
                  </span>
                  <ChevronRight
                    className="h-5 w-5 text-slate-400 group-hover:text-accent transition-colors"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
