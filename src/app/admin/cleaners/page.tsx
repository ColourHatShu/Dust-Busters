import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Star, Users } from "lucide-react";
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

  // Aggregate ratings per cleaner. The reviews table has NO cleaner_id column —
  // the cleaner is on the related booking — so embed bookings(cleaner_id).
  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating, bookings(cleaner_id)")
    .returns<
      { rating: number; bookings: { cleaner_id: string | null } | null }[]
    >();

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
    const bk = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
    const cid = bk?.cleaner_id;
    if (!cid) continue;
    if (!statsMap[cid])
      statsMap[cid] = {
        completed: 0, cancelled: 0, total: 0,
        totalRating: 0, reviewCount: 0,
        offersTotal: 0, offersAccepted: 0,
      };
    statsMap[cid].totalRating += Number(r.rating);
    statsMap[cid].reviewCount += 1;
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

  const roster = cleaners ?? [];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <Link
          href="/admin"
          className="link-subtle mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Admin
        </Link>
        <div className="flex items-center gap-3">
          <span className="icon-tile">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="page-title">Cleaners</h1>
            <p className="page-subtitle">
              {roster.length} {roster.length === 1 ? "cleaner" : "cleaners"} on the roster
            </p>
          </div>
        </div>
      </div>

      <AdminSearch placeholder="Search cleaners by name or phone" defaultValue={q} />

      {roster.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">
              <Users className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="empty-state-title">No cleaners found</p>
            <p className="empty-state-text">
              {q
                ? "No cleaners match your search. Try a different name or phone number."
                : "Cleaners will appear here once they have registered."}
            </p>
          </div>
        </div>
      ) : (
        <div className="card card-flush overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Areas</th>
                <th>Verified</th>
                <th>Active</th>
                <th className="num">Jobs Done</th>
                <th className="num">Avg Rating</th>
                <th className="num">Cancel Rate</th>
                <th className="num">Accept Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((c) => {
                const d = Array.isArray(c.cleaner_details)
                  ? c.cleaner_details[0]
                  : c.cleaner_details;
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
                    <td className="text-xs text-slate-500">
                      {(d?.areas_served ?? []).join(", ") || "—"}
                    </td>
                    <td>
                      {verified ? (
                        <span className="badge badge-success">
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          Verified
                        </span>
                      ) : (
                        <span className="badge badge-neutral">Unverified</span>
                      )}
                    </td>
                    <td>
                      {active ? (
                        <span className="badge badge-info">
                          <span className="badge-dot" />
                          Active
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          <span className="badge-dot" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="num">{stats.completed}</td>
                    <td className="num">
                      {avgRating === "—" ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span className="inline-flex items-center justify-end gap-1 font-medium text-slate-700">
                          <Star
                            className="h-3.5 w-3.5 text-amber-400"
                            fill="currentColor"
                            aria-hidden="true"
                          />
                          {avgRating}
                        </span>
                      )}
                    </td>
                    <td className="num">{cancelRate}</td>
                    <td className="num">{acceptRate}</td>
                    <td>
                      <div className="flex gap-2">
                        <form
                          action={async () => {
                            "use server";
                            await setCleanerVerified(c.id, !verified);
                          }}
                        >
                          <button className="btn-base btn-secondary text-xs py-1 px-2">
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
                            className={`btn-base text-xs py-1 px-2 ${
                              active
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            }`}
                          >
                            {active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
