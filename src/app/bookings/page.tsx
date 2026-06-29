import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bookingBadgeClass, bookingStatusLabel } from "@/lib/status";
import { Calendar, Clock, ChevronRight, Sparkles, Plus } from "lucide-react";

type Booking = {
  id: string;
  status: string;
  area: string;
  scheduled_at: string;
  hours: number;
  total_amount: number;
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
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="page-title">My Bookings</h1>
          <p className="page-subtitle">Track and manage your cleaning appointments.</p>
        </div>
        <Link href="/book" className="btn-base btn-primary text-sm px-4 py-2 flex-shrink-0">
          <Plus className="h-4 w-4" strokeWidth={2} />
          New booking
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="segmented">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/bookings?tab=${t.key}`}
            className={`seg-item ${activeTab === t.key ? "seg-item-active" : ""}`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
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
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">
              <Sparkles className="h-7 w-7" strokeWidth={1.5} />
            </span>
            <p className="empty-state-title">
              {activeTab === "all" ? "No bookings yet" : `No ${activeTab} bookings`}
            </p>
            <p className="empty-state-text">
              {activeTab === "all"
                ? "Your bookings will appear here once you book a cleaning."
                : "Nothing to show for this filter."}
            </p>
            {activeTab === "all" && (
              <Link href="/book" className="btn-base btn-primary">
                Book a cleaning
              </Link>
            )}
          </div>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((b) => (
            <li key={b.id}>
              <Link
                href={`/bookings/${b.id}`}
                className="card card-interactive card-sm flex items-center justify-between gap-4 group"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{b.area}</span>
                    <span className={bookingBadgeClass(b.status)}>
                      {bookingStatusLabel(b.status)}
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
                  <span className="text-lg font-bold text-gradient tabular-nums">
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
