import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Scale, ArrowRight, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const statusPill: Record<string, string> = {
  open: "pill pill-danger",
  investigating: "pill pill-warning",
  resolved: "pill pill-success",
  closed: "pill pill-neutral",
};

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: filterStatus } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/");

  let query = supabase
    .from("disputes")
    .select(
      `id, category, status, description, created_at,
       booking:bookings(id, area, scheduled_at),
       raised_by_profile:profiles!disputes_raised_by_fkey(name)`
    )
    .order("created_at", { ascending: false });

  if (filterStatus && filterStatus !== "all") {
    query = query.eq("status", filterStatus);
  }

  const { data: disputes } = await query;

  const STATUSES = ["all", "open", "investigating", "resolved", "closed"];
  const activeStatus = filterStatus ?? "all";
  const rows = disputes ?? [];

  return (
    <main className="app-shell">
      <span className="section-glow absolute -top-24 left-1/4 h-72 w-72" aria-hidden />
      <span className="section-glow section-glow--sky absolute -top-16 right-1/4 h-64 w-64" aria-hidden />

      <div className="app-container relative z-10 py-10">
        {/* Back link */}
        <Link
          href="/admin"
          className="link-accent focus-ring mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ChevronLeft className="h-4 w-4" />
          Admin
        </Link>

        {/* Page header */}
        <header className="page-header">
          <span className="page-eyebrow">
            <Scale className="h-3.5 w-3.5" />
            Moderation
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title text-gradient-on-dark">Disputes</h1>
            <span className="pill pill-neutral">
              {rows.length} {rows.length === 1 ? "case" : "cases"}
            </span>
          </div>
          <p className="page-subtitle">
            Review and resolve customer and cleaner disputes. Filter by status to triage
            what needs attention first.
          </p>
        </header>

        {/* Status Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {STATUSES.map((s) => {
            const isActive = activeStatus === s;
            return (
              <Link
                key={s}
                href={`/admin/disputes${s === "all" ? "" : `?status=${s}`}`}
                aria-current={isActive ? "page" : undefined}
                className={`focus-ring rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? "border-transparent bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_8px_24px_-10px_rgba(16,185,129,0.7)]"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-teal-400/40 hover:text-white"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Link>
            );
          })}
        </div>

        {/* Disputes table */}
        <div className="table-wrap overflow-x-auto">
          <table className="table-dark min-w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Booking</th>
                <th>Raised By</th>
                <th>Category</th>
                <th>Status</th>
                <th>Date</th>
                <th className="text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
                        <Inbox className="h-5 w-5 text-slate-400" />
                      </span>
                      <p className="text-dim text-sm">No disputes found.</p>
                    </div>
                  </td>
                </tr>
              )}
              {rows.map((d) => {
                const booking = Array.isArray(d.booking) ? d.booking[0] : d.booking;
                const raisedBy = Array.isArray(d.raised_by_profile)
                  ? d.raised_by_profile[0]
                  : d.raised_by_profile;
                return (
                  <tr key={d.id}>
                    <td className="font-mono text-xs text-slate-500">
                      {String(d.id).slice(0, 8)}
                    </td>
                    <td>
                      <span className="text-sm text-slate-300">
                        {booking?.area ?? "—"}
                      </span>
                      {booking?.scheduled_at && (
                        <span className="block text-xs text-slate-500">
                          {new Date(booking.scheduled_at).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="text-slate-200">{raisedBy?.name ?? "—"}</td>
                    <td className="capitalize text-slate-300">{d.category ?? "—"}</td>
                    <td>
                      <span className={statusPill[d.status] ?? "pill pill-neutral"}>
                        <span className="pill-dot" />
                        {d.status}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/admin/disputes/${d.id}`}
                        className="link-accent focus-ring inline-flex items-center gap-1 text-xs font-medium"
                      >
                        Manage
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
