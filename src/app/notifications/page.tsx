import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { Bell, ChevronRight } from "lucide-react";
import { markAllRead } from "./actions";

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
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-accent" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="text-sm text-accent hover:underline focus:outline-none"
            >
              Mark all read
            </button>
          </form>
        )}
      </div>

      {items.length === 0 && (
        <div className="card flex flex-col items-center gap-4 py-16 text-center">
          <Bell className="h-12 w-12 text-slate-300" strokeWidth={1} />
          <p className="text-slate-500">No notifications yet.</p>
        </div>
      )}

      {groupOrder.map((group) => {
        const groupItems = groups[group];
        if (groupItems.length === 0) return null;
        return (
          <section key={group} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {group}
            </h2>
            <ul className="flex flex-col gap-2">
              {groupItems.map((n) => (
                <li
                  key={n.id}
                  className={[
                    "card flex items-start gap-4 transition-colors",
                    !n.read_at
                      ? "border-l-4 border-accent bg-accent/5"
                      : "border-l-4 border-transparent",
                  ].join(" ")}
                >
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm font-semibold text-slate-900">
                      {n.title}
                    </p>
                    <p className="text-sm text-slate-600">{n.body}</p>
                    <p className="text-xs text-slate-400">{timeAgo(n.created_at)}</p>
                  </div>

                  {n.booking_id && (
                    <Link
                      href={`/bookings/${n.booking_id}`}
                      className="flex items-center gap-1 text-xs text-accent hover:underline whitespace-nowrap"
                    >
                      View booking
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
