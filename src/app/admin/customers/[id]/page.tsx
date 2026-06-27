import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  Inbox,
  MessageSquareQuote,
  Phone,
  Star,
  User,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// Real booking_status enum values (no pending/confirmed).
// Maps each status to a shared dark-theme status pill (hue family preserved
// from the original light-theme palette).
const statusPill: Record<string, string> = {
  broadcasting: "pill-info", // blue
  accepted: "pill-warning", // yellow
  deposit_paid: "pill-success", // green
  in_progress: "pill-accent", // indigo → teal (active)
  completed: "pill-warning", // orange (warm)
  balance_paid: "pill-success", // green
  closed: "pill-neutral", // gray
  cancelled: "pill-danger", // red
  no_cleaner_found: "pill-danger", // red
  disputed: "pill-danger", // purple → alert
};

export default async function AdminCustomerDetailPage({
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

  const { data: customer } = await supabase
    .from("profiles")
    .select("id, name, phone, created_at, role")
    .eq("id", id)
    .eq("role", "customer")
    .single();

  if (!customer) notFound();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, status, area, scheduled_at, hours, total_amount, cleaner:profiles!bookings_cleaner_id_fkey(name)"
    )
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  const totalSpent = (bookings ?? [])
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0);

  // Two-way reviews: this customer's rating + the reviews cleaners left.
  const { data: ratingData } = await supabase.rpc("get_customer_rating", {
    p_customer: id,
  });
  const rating = (Array.isArray(ratingData) ? ratingData[0] : ratingData) as
    | { avg_rating: number | null; review_count: number }
    | null;
  const { data: customerReviews } = await supabase
    .from("customer_reviews")
    .select("id, rating, comment, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .returns<
      { id: string; rating: number; comment: string | null; created_at: string }[]
    >();

  const bookingCount = (bookings ?? []).length;
  const reviews = customerReviews ?? [];

  const stats = [
    {
      label: "Phone",
      value: customer.phone ?? "—",
      icon: Phone,
      tint: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
    },
    {
      label: "Joined",
      value: new Date(customer.created_at).toLocaleDateString(),
      icon: CalendarDays,
      tint: "bg-sky-500/10 text-sky-300 ring-sky-400/20",
    },
    {
      label: "Total Bookings",
      value: String(bookingCount),
      icon: ClipboardList,
      tint: "bg-teal-500/10 text-teal-200 ring-teal-400/20",
    },
    {
      label: "Spent (completed)",
      value: `$${totalSpent.toFixed(2)}`,
      icon: Wallet,
      tint: "bg-amber-500/10 text-amber-300 ring-amber-400/20",
    },
  ];

  return (
    <main className="app-shell relative overflow-hidden">
      <span
        className="section-glow -top-32 left-1/4 h-72 w-72"
        aria-hidden="true"
      />
      <span
        className="section-glow section-glow--sky top-48 -right-24 h-80 w-80"
        aria-hidden="true"
      />

      <div className="app-container relative z-10 space-y-8 py-10 sm:py-14">
        <Link
          href="/admin/customers"
          className="link-accent inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Customers
        </Link>

        {/* Header */}
        <header className="page-header">
          <span className="page-eyebrow">
            <User className="h-3.5 w-3.5" />
            Customer Profile
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <h1 className="page-title text-gradient-on-dark">
              {customer.name ?? "Unnamed customer"}
            </h1>
            {rating?.avg_rating != null ? (
              <span className="pill pill-warning gap-1.5">
                <Star className="h-3.5 w-3.5 fill-current" />
                {rating.avg_rating} · {rating.review_count}{" "}
                {rating.review_count === 1 ? "review" : "reviews"}
              </span>
            ) : (
              <span className="pill pill-neutral">No cleaner ratings yet</span>
            )}
          </div>
          <p className="page-subtitle">
            Account overview, reviews from cleaners, and full booking history.
          </p>
        </header>

        {/* Stat tiles */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="surface-muted flex items-center gap-3"
              >
                <span
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${s.tint}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-faint text-xs font-medium uppercase tracking-wide">
                    {s.label}
                  </p>
                  <p className="truncate text-base font-semibold text-slate-100">
                    {s.value}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        {/* Reviews from cleaners */}
        {reviews.length > 0 && (
          <section className="surface-card">
            <div className="mb-5 flex items-center gap-2">
              <MessageSquareQuote className="h-5 w-5 text-teal-300" />
              <h2 className="text-lg font-semibold tracking-tight text-slate-100">
                Reviews from cleaners
              </h2>
              <span className="pill pill-neutral ml-1">{reviews.length}</span>
            </div>
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="surface-muted">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < r.rating
                                ? "fill-amber-400 text-amber-400"
                                : "fill-none text-slate-600"
                            }`}
                          />
                        ))}
                      </span>
                      <span className="text-sm font-semibold text-slate-100">
                        {r.rating}/5
                      </span>
                    </div>
                    <span className="text-faint text-xs">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {r.comment}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Booking History */}
        <section className="surface-card">
          <div className="mb-5 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-300" />
            <h2 className="text-lg font-semibold tracking-tight text-slate-100">
              Booking History
            </h2>
            {bookingCount > 0 && (
              <span className="pill pill-neutral ml-1">{bookingCount}</span>
            )}
          </div>

          {bookingCount === 0 ? (
            <div className="surface-muted flex flex-col items-center gap-3 py-12 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400 ring-1 ring-white/10">
                <Inbox className="h-6 w-6" />
              </span>
              <p className="text-faint text-sm">No bookings yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="overflow-x-auto">
                <table className="table-dark min-w-[680px]">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Cleaner</th>
                      <th>Status</th>
                      <th>Area</th>
                      <th>Scheduled</th>
                      <th>Total</th>
                      <th className="text-right">{""}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bookings ?? []).map((b) => {
                      const cleaner = Array.isArray(b.cleaner)
                        ? b.cleaner[0]
                        : b.cleaner;
                      return (
                        <tr key={b.id}>
                          <td className="font-mono text-xs text-slate-500">
                            {String(b.id).slice(0, 8)}
                          </td>
                          <td className="text-slate-200">
                            {cleaner?.name ?? "—"}
                          </td>
                          <td>
                            <span
                              className={`pill ${statusPill[b.status] ?? "pill-neutral"} capitalize`}
                            >
                              <span className="pill-dot" />
                              {b.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td>{b.area ?? "—"}</td>
                          <td className="text-xs text-slate-400">
                            {b.scheduled_at
                              ? new Date(b.scheduled_at).toLocaleString()
                              : "—"}
                          </td>
                          <td className="font-medium text-slate-100">
                            {b.total_amount != null
                              ? `$${Number(b.total_amount).toFixed(2)}`
                              : "—"}
                          </td>
                          <td className="text-right">
                            <Link
                              href={`/admin/bookings/${b.id}`}
                              className="link-accent inline-flex items-center gap-1 text-xs font-medium"
                            >
                              View
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
