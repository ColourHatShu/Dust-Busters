import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, ChevronRight, ShieldAlert, ShieldCheck } from "lucide-react";

const disputeBadgeClass: Record<string, string> = {
  open: "badge badge-warning",
  investigating: "badge badge-info",
  resolved: "badge badge-success",
  closed: "badge badge-neutral",
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

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <Link
          href="/admin"
          className="link-subtle inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Admin
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="icon-tile">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <h1 className="page-title">Disputes</h1>
            <p className="page-subtitle">Review and resolve reported issues</p>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="segmented mb-6">
        {STATUSES.map((s) => {
          const active = (filterStatus ?? "all") === s;
          return (
            <Link
              key={s}
              href={`/admin/disputes${s === "all" ? "" : `?status=${s}`}`}
              className={`seg-item ${active ? "seg-item-active" : ""}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Link>
          );
        })}
      </div>

      <div className="card card-flush overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Booking</th>
              <th>Raised By</th>
              <th>Category</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(disputes ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="p-0">
                  <div className="empty-state">
                    <span className="empty-state-icon">
                      <ShieldCheck className="h-6 w-6" />
                    </span>
                    <p className="empty-state-title">No disputes found</p>
                    <p className="empty-state-text">
                      Nothing matches the selected filter right now.
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {(disputes ?? []).map((d) => {
              const booking = Array.isArray(d.booking) ? d.booking[0] : d.booking;
              const raisedBy = Array.isArray(d.raised_by_profile)
                ? d.raised_by_profile[0]
                : d.raised_by_profile;
              return (
                <tr key={d.id}>
                  <td className="font-mono text-xs text-slate-400">
                    {String(d.id).slice(0, 8)}
                  </td>
                  <td>
                    <span className="text-xs text-slate-600">
                      {booking?.area ?? "—"}
                      {booking?.scheduled_at && (
                        <>
                          {" · "}
                          {new Date(booking.scheduled_at).toLocaleDateString()}
                        </>
                      )}
                    </span>
                  </td>
                  <td>{raisedBy?.name ?? "—"}</td>
                  <td className="capitalize">{d.category ?? "—"}</td>
                  <td>
                    <span
                      className={`${disputeBadgeClass[d.status] ?? "badge badge-neutral"} capitalize`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-xs text-slate-400">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <Link
                      href={`/admin/disputes/${d.id}`}
                      className="link-accent inline-flex items-center gap-1 text-xs"
                    >
                      Manage <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
