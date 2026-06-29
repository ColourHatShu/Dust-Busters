import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Phone,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bookingBadgeClass, bookingStatusLabel } from "@/lib/status";

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

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

  const bookingList = bookings ?? [];
  const reviewList = customerReviews ?? [];

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <Link
          href="/admin/customers"
          className="link-subtle inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Customers
        </Link>
        <h1 className="page-title mt-2">Customer Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="card card-lg">
        <div className="flex items-center gap-4">
          <span className="avatar h-16 w-16 text-xl" aria-hidden="true">
            {getInitials(customer.name)}
          </span>
          <div className="min-w-0">
            <h2 className="section-title truncate">{customer.name ?? "—"}</h2>
            <p className="mt-0.5 text-sm text-slate-500">Customer</p>
          </div>
        </div>
        <hr className="hr-soft my-5" />
        <div>
          <div className="detail-row">
            <span className="detail-label">
              <Phone className="h-4 w-4" aria-hidden="true" />
              Phone
            </span>
            <span className="detail-value">{customer.phone ?? "—"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Joined
            </span>
            <span className="detail-value">
              {new Date(customer.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <span className="stat-label">Total Bookings</span>
          <span className="stat-value">{bookingList.length}</span>
        </div>
        <div className="stat-card stat-card-accent">
          <span className="stat-label">Total Spent</span>
          <span className="stat-value">${totalSpent.toFixed(2)}</span>
          <span className="stat-sub">Completed bookings</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Rating from cleaners</span>
          <span className="stat-value">
            {rating?.avg_rating != null ? rating.avg_rating : "—"}
          </span>
          <span className="stat-sub">
            {rating?.avg_rating != null
              ? `${rating.review_count} ${rating.review_count === 1 ? "review" : "reviews"}`
              : "No reviews yet"}
          </span>
        </div>
      </div>

      {/* Reviews from cleaners */}
      {reviewList.length > 0 && (
        <div className="card">
          <div className="mb-4 flex items-center gap-3">
            <span className="icon-tile icon-tile-sm icon-tile-soft" aria-hidden="true">
              <Star className="h-4 w-4" />
            </span>
            <h2 className="section-title">Reviews from cleaners</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {reviewList.map((r) => (
              <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="badge badge-accent">
                    <Star className="h-3 w-3" aria-hidden="true" />
                    {r.rating}/5
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-1.5 text-sm text-slate-600">{r.comment}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Booking History */}
      <div className="card card-flush overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="icon-tile icon-tile-sm icon-tile-soft" aria-hidden="true">
              <ClipboardList className="h-4 w-4" />
            </span>
            <h2 className="section-title">Booking History</h2>
          </div>
          <span className="badge badge-neutral">{bookingList.length}</span>
        </div>
        {bookingList.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              <ClipboardList className="h-7 w-7" strokeWidth={1.5} />
            </span>
            <p className="empty-state-title">No bookings yet</p>
            <p className="empty-state-text">
              This customer hasn&apos;t booked any cleanings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cleaner</th>
                  <th>Status</th>
                  <th>Area</th>
                  <th>Scheduled</th>
                  <th className="num">Total</th>
                  <th className="num"></th>
                </tr>
              </thead>
              <tbody>
                {bookingList.map((b) => {
                  const cleaner = Array.isArray(b.cleaner) ? b.cleaner[0] : b.cleaner;
                  return (
                    <tr key={b.id}>
                      <td className="font-mono text-xs text-slate-500">
                        {String(b.id).slice(0, 8)}
                      </td>
                      <td>{cleaner?.name ?? "—"}</td>
                      <td>
                        <span className={bookingBadgeClass(b.status)}>
                          {bookingStatusLabel(b.status)}
                        </span>
                      </td>
                      <td>{b.area ?? "—"}</td>
                      <td className="whitespace-nowrap text-xs">
                        {b.scheduled_at
                          ? new Date(b.scheduled_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="num">
                        {b.total_amount != null
                          ? `$${Number(b.total_amount).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="num">
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          className="link-accent text-xs"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
