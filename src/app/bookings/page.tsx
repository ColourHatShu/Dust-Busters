import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Calendar, Clock, ChevronRight, Sparkles, Plus } from "lucide-react";

type Booking = {
  id: string;
  status: string;
  area: string;
  scheduled_at: string;
  hours: number;
  total_amount: number;
};

// Maps each booking status to a shared dark-theme status-pill variant.
const STATUS_PILL: Record<string, string> = {
  broadcasting: "pill-info",
  accepted: "pill-warning",
  deposit_paid: "pill-success",
  in_progress: "pill-accent",
  completed: "pill-warning",
  balance_paid: "pill-success",
  closed: "pill-neutral",
  cancelled: "pill-danger",
  no_cleaner_found: "pill-danger",
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
    <main className="app-shell min-h-screen pb-20">
      <div className="relative mx-auto w-full max-w-2xl px-6 pt-10 sm:pt-14">
        {/* Ambient glows */}
        <span
          className="section-glow section-glow--teal absolute -top-12 right-0 h-64 w-64"
          aria-hidden="true"
        />
        <span
          className="section-glow absolute top-48 -left-16 h-56 w-56"
          aria-hidden="true"
        />

        <div className="relative z-10 space-y-8">
          {/* Header */}
          <header className="page-header sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <span className="page-eyebrow">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                Your cleanings
              </span>
              <h1 className="page-title">My Bookings</h1>
              <p className="page-subtitle">
                Track every cleaning from first match to final payment, all in one place.
              </p>
            </div>
            <Link
              href="/book"
              className="btn-base btn-glow shrink-0 self-start text-sm sm:self-auto"
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              New booking
            </Link>
          </header>

          {/* Filter tabs */}
          <nav className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-sm">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={`/bookings?tab=${t.key}`}
                aria-current={activeTab === t.key ? "page" : undefined}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-center text-sm font-medium transition-all ${
                  activeTab === t.key
                    ? "bg-emerald-500/15 text-emerald-100 shadow-sm ring-1 ring-emerald-400/30"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                      activeTab === t.key
                        ? "bg-emerald-400/20 text-emerald-200"
                        : "bg-white/[0.06] text-slate-400"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Booking list */}
          {filtered.length === 0 ? (
            <div className="surface-card flex flex-col items-center gap-5 py-16 text-center">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-400/25 bg-gradient-to-br from-emerald-500/15 to-sky-500/10">
                <span
                  className="absolute inset-0 -z-10 rounded-2xl bg-emerald-400/15 blur-xl"
                  aria-hidden="true"
                />
                <Sparkles className="h-8 w-8 text-teal-300" strokeWidth={1.5} />
              </div>
              <div className="space-y-1.5">
                <p className="text-lg font-semibold text-slate-100">
                  {activeTab === "all" ? "No bookings yet" : `No ${activeTab} bookings`}
                </p>
                <p className="mx-auto max-w-xs text-sm text-slate-400">
                  {activeTab === "all"
                    ? "Your bookings will appear here once you book a cleaning."
                    : "Nothing to show for this filter."}
                </p>
              </div>
              {activeTab === "all" && (
                <Link href="/book" className="btn-base btn-glow">
                  <Plus className="h-4 w-4" strokeWidth={2.25} />
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
                    className="surface-card surface-card-interactive group flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="truncate font-semibold text-slate-100">
                          {b.area}
                        </span>
                        <span className={`pill ${STATUS_PILL[b.status] ?? "pill-neutral"}`}>
                          <span className="pill-dot" />
                          {STATUS_LABEL[b.status] ?? b.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar
                            className="h-3.5 w-3.5 text-slate-500"
                            strokeWidth={1.5}
                          />
                          {formatDate(b.scheduled_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock
                            className="h-3.5 w-3.5 text-slate-500"
                            strokeWidth={1.5}
                          />
                          {formatTime(b.scheduled_at)} &middot; {b.hours}h
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <div className="text-right">
                        <span className="block text-lg font-bold text-gradient-on-dark">
                          ${Number(b.total_amount).toFixed(2)}
                        </span>
                        <span className="block text-[0.7rem] uppercase tracking-wide text-slate-500">
                          total
                        </span>
                      </div>
                      <ChevronRight
                        className="h-5 w-5 text-slate-500 transition-colors group-hover:text-teal-300"
                        strokeWidth={1.5}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
