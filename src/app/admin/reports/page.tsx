import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Flag, ShieldCheck } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { resolveReport } from "./actions";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

type ReportRow = {
  id: string;
  reason: string | null;
  status: string;
  created_at: string;
  booking_id: string;
  message: { body: string; created_at: string } | { body: string; created_at: string }[] | null;
  reporter: { name: string | null } | { name: string | null }[] | null;
};

const one = <T,>(v: T | T[] | null): T | null =>
  Array.isArray(v) ? v[0] ?? null : v;

export default async function AdminReportsPage() {
  const supabase = await createServerClient();
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

  const svc = serviceClient();
  const { data } = await svc
    .from("message_reports")
    .select(
      `id, reason, status, created_at, booking_id,
       message:booking_messages!message_reports_message_id_fkey(body, created_at),
       reporter:profiles!message_reports_reported_by_fkey(name)`
    )
    .eq("status", "open")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as ReportRow[];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Link
        href="/admin"
        className="link-subtle mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Admin
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <span className="icon-tile icon-tile-warn" aria-hidden="true">
          <Flag className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="page-title">Flagged messages</h1>
          <p className="page-subtitle">
            {rows.length} open {rows.length === 1 ? "report" : "reports"}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="empty-state-title">No open reports</p>
            <p className="empty-state-text">
              Flagged chat messages will appear here for review.
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((r) => {
            const message = one(r.message);
            const reporter = one(r.reporter);
            return (
              <li key={r.id} className="card card-accent flex flex-col gap-3">
                <div className="surface-muted p-3 text-sm text-slate-700">
                  {message?.body ?? "(message no longer available)"}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>Reported by {reporter?.name ?? "—"}</span>
                  {r.reason && <span>Reason: {r.reason}</span>}
                  <Link
                    href={`/admin/bookings/${r.booking_id}`}
                    className="link-accent font-medium"
                  >
                    View booking
                  </Link>
                </div>
                <div className="flex gap-2">
                  <form action={resolveReport}>
                    <input type="hidden" name="report_id" value={r.id} />
                    <input type="hidden" name="status" value="reviewed" />
                    <button type="submit" className="btn-base btn-secondary text-sm">
                      Mark reviewed
                    </button>
                  </form>
                  <form action={resolveReport}>
                    <input type="hidden" name="report_id" value={r.id} />
                    <input type="hidden" name="status" value="dismissed" />
                    <button type="submit" className="btn-base btn-secondary text-sm">
                      Dismiss
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
