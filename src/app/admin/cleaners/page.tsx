import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Star,
  ShieldCheck,
  ShieldOff,
  Power,
  PowerOff,
  SearchX,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setCleanerVerified, setCleanerActive } from "./actions";
import AdminSearch from "../AdminSearch";

export default async function AdminCleanersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
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

  let cleanersQuery = supabase
    .from("profiles")
    .select("id, name, phone, cleaner_details(id_verified, active, areas_served)")
    .eq("role", "cleaner");
  if (q) {
    cleanersQuery = cleanersQuery.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data: cleaners } = await cleanersQuery;

  // Aggregate booking stats per cleaner
  const { data: bookings } = await supabase
    .from("bookings")
    .select("cleaner_id, status");

  // Aggregate ratings per cleaner
  const { data: reviews } = await supabase
    .from("reviews")
    .select("cleaner_id, rating");

  // Aggregate offers (accepted vs total) per cleaner.
  // Real table is `booking_offers` with column `state` (not `offers`/`status`).
  const { data: offers } = await supabase
    .from("booking_offers")
    .select("cleaner_id, state");

  type CleanerStats = {
    completed: number;
    cancelled: number;
    total: number;
    totalRating: number;
    reviewCount: number;
    offersTotal: number;
    offersAccepted: number;
  };

  const statsMap: Record<string, CleanerStats> = {};

  for (const b of bookings ?? []) {
    if (!b.cleaner_id) continue;
    if (!statsMap[b.cleaner_id])
      statsMap[b.cleaner_id] = {
        completed: 0, cancelled: 0, total: 0,
        totalRating: 0, reviewCount: 0,
        offersTotal: 0, offersAccepted: 0,
      };
    statsMap[b.cleaner_id].total += 1;
    if (b.status === "completed") statsMap[b.cleaner_id].completed += 1;
    if (b.status === "cancelled") statsMap[b.cleaner_id].cancelled += 1;
  }

  for (const r of reviews ?? []) {
    if (!r.cleaner_id) continue;
    if (!statsMap[r.cleaner_id])
      statsMap[r.cleaner_id] = {
        completed: 0, cancelled: 0, total: 0,
        totalRating: 0, reviewCount: 0,
        offersTotal: 0, offersAccepted: 0,
      };
    statsMap[r.cleaner_id].totalRating += Number(r.rating);
    statsMap[r.cleaner_id].reviewCount += 1;
  }

  for (const o of offers ?? []) {
    if (!o.cleaner_id) continue;
    if (!statsMap[o.cleaner_id])
      statsMap[o.cleaner_id] = {
        completed: 0, cancelled: 0, total: 0,
        totalRating: 0, reviewCount: 0,
        offersTotal: 0, offersAccepted: 0,
      };
    statsMap[o.cleaner_id].offersTotal += 1;
    if (o.state === "accepted") statsMap[o.cleaner_id].offersAccepted += 1;
  }

  const list = cleaners ?? [];

  // Resolve the (array-or-object) embedded cleaner_details once.
  const getDetails = (c: (typeof list)[number]) =>
    Array.isArray(c.cleaner_details) ? c.cleaner_details[0] : c.cleaner_details;

  const verifiedCount = list.filter((c) => getDetails(c)?.id_verified).length;
  const activeCount = list.filter((c) => getDetails(c)?.active).length;

  const actionBase =
    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400";

  return (
    <main className="app-shell">
      {/* Ambient depth glows */}
      <span className="section-glow absolute -top-24 left-1/4 h-72 w-72" aria-hidden="true" />
      <span className="section-glow section-glow--sky absolute right-0 top-32 h-72 w-72" aria-hidden="true" />

      <div className="app-container relative py-10">
        <header className="page-header">
          <Link
            href="/admin"
            className="link-accent inline-flex w-fit items-center gap-1.5 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Admin
          </Link>
          <span className="page-eyebrow">
            <Users className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            Cleaner roster
          </span>
          <h1 className="page-title text-gradient-on-dark">Cleaners</h1>
          <p className="page-subtitle">
            Verify identities, toggle availability, and monitor delivery quality across
            your cleaning workforce.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="pill pill-neutral">{list.length} total</span>
            <span className="pill pill-success">
              <span className="pill-dot" />
              {verifiedCount} verified
            </span>
            <span className="pill pill-info">
              <span className="pill-dot" />
              {activeCount} active
            </span>
          </div>
        </header>

        <AdminSearch placeholder="Search cleaners by name or phone" defaultValue={q} />

        <div className="table-wrap overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th>Name</th>
                <th>Areas</th>
                <th>Verified</th>
                <th>Active</th>
                <th>Jobs Done</th>
                <th>Avg Rating</th>
                <th>Cancel Rate</th>
                <th>Accept Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400">
                        <SearchX className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                      </span>
                      <p className="text-sm font-medium text-slate-200">No cleaners found</p>
                      <p className="text-xs text-faint">
                        {q ? "Try a different name or phone number." : "Cleaners will appear here once they join."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((c) => {
                  const d = getDetails(c);
                  const verified = d?.id_verified ?? false;
                  const active = d?.active ?? false;
                  const stats = statsMap[c.id] ?? {
                    completed: 0, cancelled: 0, total: 0,
                    totalRating: 0, reviewCount: 0,
                    offersTotal: 0, offersAccepted: 0,
                  };
                  const avgRating = stats.reviewCount > 0
                    ? (stats.totalRating / stats.reviewCount).toFixed(1)
                    : "—";
                  const cancelRate = stats.total > 0
                    ? `${Math.round((stats.cancelled / stats.total) * 100)}%`
                    : "—";
                  const acceptRate = stats.offersTotal > 0
                    ? `${Math.round((stats.offersAccepted / stats.offersTotal) * 100)}%`
                    : "—";

                  return (
                    <tr key={c.id}>
                      <td>
                        <Link
                          href={`/admin/cleaners/${c.id}`}
                          className="link-accent font-medium"
                        >
                          {c.name ?? "(no name)"}
                        </Link>
                      </td>
                      <td className="max-w-[14rem] text-xs text-dim">
                        {(d?.areas_served ?? []).join(", ") || <span className="text-faint">—</span>}
                      </td>
                      <td>
                        {verified ? (
                          <span className="pill pill-success">
                            <span className="pill-dot" />
                            Verified
                          </span>
                        ) : (
                          <span className="pill pill-neutral">
                            <span className="pill-dot" />
                            Unverified
                          </span>
                        )}
                      </td>
                      <td>
                        {active ? (
                          <span className="pill pill-info">
                            <span className="pill-dot" />
                            Active
                          </span>
                        ) : (
                          <span className="pill pill-danger">
                            <span className="pill-dot" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="font-semibold tabular-nums text-slate-100">
                          {stats.completed}
                        </span>
                      </td>
                      <td>
                        {avgRating === "—" ? (
                          <span className="text-faint">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium tabular-nums text-slate-100">
                            <Star
                              className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                            {avgRating}
                          </span>
                        )}
                      </td>
                      <td className="tabular-nums text-dim">{cancelRate}</td>
                      <td className="tabular-nums text-dim">{acceptRate}</td>
                      <td>
                        <div className="flex gap-2">
                          <form
                            action={async () => {
                              "use server";
                              await setCleanerVerified(c.id, !verified);
                            }}
                          >
                            <button
                              className={`${actionBase} ${
                                verified
                                  ? "border-white/10 bg-white/[0.04] text-slate-300 hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-200"
                                  : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/60 hover:bg-emerald-500/20"
                              }`}
                            >
                              {verified ? (
                                <ShieldOff className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                              ) : (
                                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                              )}
                              {verified ? "Unverify" : "Verify"}
                            </button>
                          </form>
                          <form
                            action={async () => {
                              "use server";
                              await setCleanerActive(c.id, !active);
                            }}
                          >
                            <button
                              className={`${actionBase} ${
                                active
                                  ? "border-red-400/30 bg-red-500/10 text-red-200 hover:border-red-400/60 hover:bg-red-500/20"
                                  : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/60 hover:bg-emerald-500/20"
                              }`}
                            >
                              {active ? (
                                <PowerOff className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                              ) : (
                                <Power className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                              )}
                              {active ? "Deactivate" : "Activate"}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
