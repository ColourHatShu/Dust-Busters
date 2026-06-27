import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  BadgeCheck,
  Phone,
  Calendar,
  MapPin,
  Star,
  Power,
  Ban,
  Briefcase,
  Percent,
  CircleCheckBig,
  ExternalLink,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setCleanerVerified, setCleanerActive } from "../actions";

const statusPill: Record<string, string> = {
  pending: "pill pill-warning",
  confirmed: "pill pill-info",
  in_progress: "pill pill-accent",
  completed: "pill pill-success",
  cancelled: "pill pill-danger",
};

export default async function AdminCleanerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: cleaner } = await supabase
    .from("profiles")
    .select(
      "id, name, phone, created_at, cleaner_details(id_verified, active, areas_served, verified_at)"
    )
    .eq("id", id)
    .eq("role", "cleaner")
    .single();

  if (!cleaner) notFound();

  const d = Array.isArray(cleaner.cleaner_details)
    ? cleaner.cleaner_details[0]
    : cleaner.cleaner_details;

  // Bookings for this cleaner
  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, status, area, scheduled_at, hours, total_amount, customer:profiles!bookings_customer_id_fkey(name)"
    )
    .eq("cleaner_id", id)
    .order("created_at", { ascending: false });

  // Reviews link to a BOOKING (no cleaner_id / created_by columns), so resolve
  // them via this cleaner's booking ids; the reviewer name comes from each
  // booking's customer.
  const bookingIds = (bookings ?? []).map((b) => b.id);
  const customerByBooking = new Map(
    (bookings ?? []).map((b) => {
      const c = Array.isArray(b.customer) ? b.customer[0] : b.customer;
      return [b.id, (c as { name: string } | null)?.name ?? "A customer"];
    })
  );
  const reviewLookupIds = bookingIds.length
    ? bookingIds
    : ["00000000-0000-0000-0000-000000000000"];
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, booking_id")
    .in("booking_id", reviewLookupIds)
    .order("created_at", { ascending: false });

  // Offers for acceptance rate — real table booking_offers, column `state`.
  const { data: offers } = await supabase
    .from("booking_offers")
    .select("id, state")
    .eq("cleaner_id", id);

  // Compute metrics
  const totalJobs = (bookings ?? []).length;
  const completed = (bookings ?? []).filter((b) => b.status === "completed").length;
  const cancelled = (bookings ?? []).filter((b) => b.status === "cancelled").length;
  const cancelRate = totalJobs > 0 ? Math.round((cancelled / totalJobs) * 100) : 0;

  const totalOffers = (offers ?? []).length;
  const acceptedOffers = (offers ?? []).filter((o) => o.state === "accepted").length;
  const acceptRate = totalOffers > 0 ? Math.round((acceptedOffers / totalOffers) * 100) : 0;

  const totalRating = (reviews ?? []).reduce((sum, r) => sum + Number(r.rating), 0);
  const avgRating =
    (reviews ?? []).length > 0
      ? (totalRating / (reviews ?? []).length).toFixed(1)
      : null;

  const verified = d?.id_verified ?? false;
  const active = d?.active ?? false;

  // --- presentation-only derivations (no behavior change) ---
  const initial = (cleaner.name ?? "?").trim().charAt(0).toUpperCase() || "?";

  const facts = [
    { icon: Phone, label: "Phone", value: cleaner.phone ?? "—" },
    {
      icon: Calendar,
      label: "Joined",
      value: new Date(cleaner.created_at).toLocaleDateString(),
    },
    {
      icon: MapPin,
      label: "Areas Served",
      value: (d?.areas_served ?? []).join(", ") || "—",
    },
    {
      icon: BadgeCheck,
      label: "Verified At",
      value: d?.verified_at ? new Date(d.verified_at).toLocaleDateString() : "—",
    },
  ];

  const metrics = [
    {
      icon: Briefcase,
      value: String(completed),
      label: "Jobs Completed",
      chip: "from-emerald-500/15 to-sky-500/10 border-teal-400/25 text-teal-300",
    },
    {
      icon: Star,
      value: avgRating ?? "—",
      label: "Avg Rating",
      chip: "from-amber-500/15 to-orange-500/10 border-amber-400/25 text-amber-300",
    },
    {
      icon: Percent,
      value: `${cancelRate}%`,
      label: "Cancel Rate",
      chip: "from-rose-500/15 to-red-500/10 border-rose-400/25 text-rose-300",
    },
    {
      icon: CircleCheckBig,
      value: `${acceptRate}%`,
      label: "Acceptance Rate",
      chip: "from-sky-500/15 to-cyan-500/10 border-sky-400/25 text-sky-300",
    },
  ];

  return (
    <main className="app-shell min-h-screen">
      <span className="section-glow absolute -top-24 left-1/4 h-72 w-72" aria-hidden />
      <span
        className="section-glow section-glow--sky absolute right-0 top-32 h-64 w-64"
        aria-hidden
      />

      <div className="app-container relative z-10 space-y-8 py-10">
        {/* Back + header */}
        <div className="space-y-6">
          <Link
            href="/admin/cleaners"
            className="link-accent inline-flex items-center gap-1.5 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Cleaners
          </Link>

          <header className="page-header">
            <span className="page-eyebrow">
              <ShieldCheck className="h-3.5 w-3.5" />
              Cleaner Management
            </span>
            <h1 className="page-title text-gradient-on-dark">Cleaner Profile</h1>
            <p className="page-subtitle">
              Review verification, performance signals, booking history and customer
              feedback for this provider.
            </p>
          </header>
        </div>

        {/* Profile + Actions */}
        <section className="surface-card">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-teal-400/30 bg-gradient-to-br from-emerald-500/20 to-sky-500/15 text-xl font-bold text-teal-100">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-[0.7rem] uppercase tracking-[0.14em] text-faint">
                    Name
                  </p>
                  <p className="truncate text-xl font-semibold text-slate-50">
                    {cleaner.name ?? "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
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
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {facts.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3.5"
                  >
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-teal-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.68rem] uppercase tracking-[0.12em] text-faint">
                        {label}
                      </p>
                      <p className="truncate text-sm font-medium text-slate-200">
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-48">
              <form
                action={async () => {
                  "use server";
                  await setCleanerVerified(id, !verified);
                }}
              >
                <button
                  className={`btn-base w-full ${verified ? "btn-outline" : "btn-glow"}`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {verified ? "Unverify" : "Verify"}
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await setCleanerActive(id, !active);
                }}
              >
                <button
                  className={`btn-base w-full border ${
                    active
                      ? "border-red-500/30 bg-red-500/10 text-red-200 hover:border-red-500/50 hover:bg-red-500/20"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-500/50 hover:bg-emerald-500/20"
                  }`}
                >
                  {active ? (
                    <Ban className="h-4 w-4" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  {active ? "Deactivate" : "Activate"}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Performance Metrics */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">
            <Sparkles className="h-4 w-4 text-teal-300" />
            Performance
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {metrics.map(({ icon: Icon, value, label, chip }) => (
              <div
                key={label}
                className="surface-card surface-card-interactive flex flex-col items-center gap-2 text-center"
              >
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-gradient-to-br ${chip}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <p className="text-3xl font-bold text-gradient-on-dark">{value}</p>
                <p className="text-xs uppercase tracking-[0.1em] text-faint">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Booking History */}
        <section className="surface-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-50">
              <Briefcase className="h-4 w-4 text-teal-300" />
              Booking History
            </h2>
            <span className="pill pill-neutral">{totalJobs} total</span>
          </div>
          {(bookings ?? []).length === 0 ? (
            <div className="surface-muted flex flex-col items-center gap-2 py-10 text-center">
              <Briefcase className="h-6 w-6 text-slate-500" />
              <p className="text-sm text-dim">No bookings yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table-dark">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Area</th>
                    <th>Scheduled</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(bookings ?? []).map((b) => {
                    const customer = Array.isArray(b.customer) ? b.customer[0] : b.customer;
                    return (
                      <tr key={b.id}>
                        <td>
                          <Link
                            href={`/admin/bookings/${b.id}`}
                            className="link-accent font-mono text-xs"
                          >
                            {String(b.id).slice(0, 8)}
                          </Link>
                        </td>
                        <td className="text-slate-200">{customer?.name ?? "—"}</td>
                        <td>
                          <span className={statusPill[b.status] ?? "pill pill-neutral"}>
                            {String(b.status).replace(/_/g, " ")}
                          </span>
                        </td>
                        <td>{b.area ?? "—"}</td>
                        <td className="text-xs text-faint">
                          {b.scheduled_at
                            ? new Date(b.scheduled_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="font-medium text-slate-100">
                          {b.total_amount != null
                            ? `$${Number(b.total_amount).toFixed(2)}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Reviews */}
        <section className="surface-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-50">
              <MessageSquareText className="h-4 w-4 text-teal-300" />
              Reviews
            </h2>
            <span className="pill pill-accent">{(reviews ?? []).length} total</span>
          </div>
          {(reviews ?? []).length === 0 ? (
            <div className="surface-muted flex flex-col items-center gap-2 py-10 text-center">
              <MessageSquareText className="h-6 w-6 text-slate-500" />
              <p className="text-sm text-dim">No reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(reviews ?? []).map((r) => (
                <div key={r.id} className="surface-muted">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-0.5 text-sm font-semibold text-amber-200">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {r.rating}/5
                    </span>
                    <span className="text-xs text-faint">
                      by {customerByBooking.get(r.booking_id) ?? "A customer"} ·{" "}
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/admin/bookings/${r.booking_id}`}
                      className="link-accent ml-auto inline-flex items-center gap-1 text-xs"
                    >
                      Booking
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  {r.comment && (
                    <p className="text-sm leading-relaxed text-slate-300">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
