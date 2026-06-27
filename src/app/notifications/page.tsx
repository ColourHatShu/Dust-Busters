import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import {
  Bell,
  ChevronRight,
  Calendar,
  CreditCard,
  Star,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  CheckCheck,
  type LucideIcon,
} from "lucide-react";
import { markAllRead, markRead } from "./actions";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  booking_id: string | null;
  read_at: string | null;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function getGroup(dateStr: string): "Today" | "Yesterday" | "Earlier" {
  const now = new Date();
  const d = new Date(dateStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  if (d >= todayStart) return "Today";
  if (d >= yesterdayStart) return "Yesterday";
  return "Earlier";
}

// Presentation-only: choose a glyph that fits the notification type so the feed
// reads at a glance. Falls back to the bell for anything unrecognised.
function iconForType(type: string): LucideIcon {
  const t = (type ?? "").toLowerCase();
  if (t.includes("book") || t.includes("schedul") || t.includes("appoint"))
    return Calendar;
  if (
    t.includes("pay") ||
    t.includes("deposit") ||
    t.includes("refund") ||
    t.includes("invoice") ||
    t.includes("balance")
  )
    return CreditCard;
  if (t.includes("review") || t.includes("rating") || t.includes("star"))
    return Star;
  if (t.includes("message") || t.includes("chat") || t.includes("reply"))
    return MessageSquare;
  if (t.includes("complete") || t.includes("done") || t.includes("confirm"))
    return CheckCircle2;
  if (t.includes("cancel") || t.includes("declin") || t.includes("fail"))
    return XCircle;
  if (t.includes("remind") || t.includes("upcoming")) return Clock;
  return Bell;
}

export default async function NotificationsPage() {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, booking_id, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Notification[]>();

  const items = notifications ?? [];
  const unreadCount = items.filter((n) => !n.read_at).length;

  // Group notifications
  const groups: Record<"Today" | "Yesterday" | "Earlier", Notification[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };
  for (const n of items) {
    groups[getGroup(n.created_at)].push(n);
  }
  const groupOrder: Array<"Today" | "Yesterday" | "Earlier"> = [
    "Today",
    "Yesterday",
    "Earlier",
  ];

  return (
    <main className="app-shell relative min-h-screen overflow-hidden">
      {/* Ambient aurora glows behind the feed */}
      <span
        className="section-glow section-glow--teal absolute -top-24 left-1/4 h-72 w-72"
        aria-hidden
      />
      <span
        className="section-glow section-glow--sky absolute top-44 -right-24 h-64 w-64"
        aria-hidden
      />

      <div className="app-container relative z-10 py-10 sm:py-14">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Header */}
          <header className="page-header">
            <span className="page-eyebrow">
              <Bell className="h-3.5 w-3.5" strokeWidth={2} />
              Activity feed
            </span>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h1 className="page-title">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="pill pill-accent">
                    <span className="pill-dot" />
                    {unreadCount} new
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <form action={markAllRead}>
                  <button
                    type="submit"
                    className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-teal-300 transition hover:bg-white/5 hover:text-teal-200"
                  >
                    <CheckCheck className="h-4 w-4" strokeWidth={2} />
                    Mark all read
                  </button>
                </form>
              )}
            </div>

            <p className="page-subtitle">
              {unreadCount > 0
                ? `You have ${unreadCount} unread ${
                    unreadCount === 1 ? "update" : "updates"
                  } across your bookings and payments.`
                : "You're all caught up — no unread updates right now."}
            </p>
          </header>

          {items.length === 0 && (
            <div className="surface-card flex flex-col items-center gap-5 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-400/20 bg-gradient-to-br from-emerald-500/15 to-teal-500/5 text-teal-200 shadow-[0_0_40px_-12px_rgba(45,212,191,0.55)]">
                <Bell className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold text-slate-100">
                  No notifications yet
                </p>
                <p className="text-sm text-slate-500">
                  When something happens with your bookings, it&apos;ll show up
                  here.
                </p>
              </div>
            </div>
          )}

          {groupOrder.map((group) => {
            const groupItems = groups[group];
            if (groupItems.length === 0) return null;
            return (
              <section key={group} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {group}
                  </h2>
                  <span className="divider flex-1" aria-hidden />
                  <span className="text-xs font-medium text-slate-600">
                    {groupItems.length}
                  </span>
                </div>

                <ul className="flex flex-col gap-2.5">
                  {groupItems.map((n) => {
                    const Icon = iconForType(n.type);
                    const unread = !n.read_at;
                    return (
                      <li key={n.id}>
                        {/* Whole row is clickable: marks read, then opens the booking
                            if there is one (otherwise just clears the unread state). */}
                        <form action={markRead.bind(null, n.id, n.booking_id)}>
                          <button
                            type="submit"
                            className={[
                              "group focus-ring relative flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-300",
                              unread
                                ? "border-teal-400/25 bg-gradient-to-br from-teal-500/[0.08] to-white/[0.015] hover:border-teal-300/45 hover:from-teal-500/[0.12]"
                                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
                            ].join(" ")}
                          >
                            {/* Unread accent rail */}
                            {unread && (
                              <span
                                className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 to-teal-400 shadow-[0_0_12px_-1px_rgba(45,212,191,0.7)]"
                                aria-hidden
                              />
                            )}

                            {/* Type icon tile */}
                            <span
                              className={[
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                                unread
                                  ? "border-teal-400/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-teal-200 shadow-[0_0_20px_-6px_rgba(45,212,191,0.5)]"
                                  : "border-white/10 bg-white/[0.03] text-slate-400 group-hover:text-slate-300",
                              ].join(" ")}
                            >
                              <Icon className="h-5 w-5" strokeWidth={1.5} />
                            </span>

                            {/* Content */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <p
                                  className={[
                                    "truncate text-sm font-semibold",
                                    unread ? "text-white" : "text-slate-300",
                                  ].join(" ")}
                                >
                                  {n.title}
                                </p>
                                {unread && (
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.9)]"
                                    aria-hidden
                                  />
                                )}
                              </div>
                              <p className="text-sm leading-relaxed text-slate-400">
                                {n.body}
                              </p>
                              <p className="flex items-center gap-1.5 pt-0.5 text-xs text-slate-500">
                                <Clock className="h-3 w-3" strokeWidth={2} />
                                {timeAgo(n.created_at)}
                              </p>
                            </div>

                            {/* Affordance for rows that open a booking */}
                            {n.booking_id && (
                              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:text-teal-300" />
                            )}
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
