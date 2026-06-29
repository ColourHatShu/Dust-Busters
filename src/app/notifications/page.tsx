import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { Bell, ChevronRight } from "lucide-react";
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
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="icon-tile">
            <Bell className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="flex items-center gap-2.5">
            <h1 className="page-title">Notifications</h1>
            {unreadCount > 0 && (
              <span className="badge badge-accent">{unreadCount} new</span>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <form action={markAllRead} className="shrink-0">
            <button type="submit" className="link-accent text-sm">
              Mark all read
            </button>
          </form>
        )}
      </div>

      {items.length === 0 && (
        <div className="card card-flush">
          <div className="empty-state">
            <span className="empty-state-icon">
              <Bell className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <p className="empty-state-title">No notifications yet</p>
            <p className="empty-state-text">
              You&apos;re all caught up. Updates about your bookings will appear
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
            <h2 className="eyebrow-label">{group}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {groupItems.map((n) => (
                <li key={n.id}>
                  {/* Whole row is clickable: marks read, then opens the booking
                      if there is one (otherwise just clears the unread state). */}
                  <form action={markRead.bind(null, n.id, n.booking_id)}>
                    <button
                      type="submit"
                      style={
                        !n.read_at
                          ? { backgroundColor: "rgba(16, 185, 129, 0.06)" }
                          : undefined
                      }
                      className={[
                        "card card-interactive card-sm flex w-full items-start gap-3 text-left",
                        !n.read_at ? "card-accent" : "",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "icon-tile icon-tile-sm",
                          n.read_at ? "icon-tile-neutral" : "",
                        ].join(" ")}
                      >
                        <Bell className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p
                          className={[
                            "text-sm font-semibold",
                            n.read_at ? "text-slate-700" : "text-slate-900",
                          ].join(" ")}
                        >
                          {n.title}
                        </p>
                        <p className="text-sm text-slate-600">{n.body}</p>
                        <p className="text-xs text-slate-400">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                      {n.booking_id && (
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      )}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
