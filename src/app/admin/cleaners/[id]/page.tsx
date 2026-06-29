import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  MapPin,
  MessageSquare,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bookingBadgeClass, bookingStatusLabel } from "@/lib/status";
import { setCleanerVerified, setCleanerActive } from "../actions";
import ConfirmSubmit from "@/components/ConfirmSubmit";

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

  const reviewCount = (reviews ?? []).length;
  const totalRating = (reviews ?? []).reduce((sum, r) => sum + Number(r.rating), 0);
  const avgRating = reviewCount > 0 ? (totalRating / reviewCount).toFixed(1) : null;

  const verified = d?.id_verified ?? false;
  const active = d?.active ?? false;

  const initials =
    (cleaner.name ?? "")
      .split(" ")
      .map((s: string) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <Link
          href="/admin/cleaners"
          className="link-subtle mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Cleaners
        </Link>
        <h1 className="page-title">Cleaner Profile</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile */}
          <div className="card space-y-5">
            <div className="flex items-center gap-4">
              <span className="avatar h-14 w-14 text-lg" aria-hidden="true">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="text-xl font-semibold text-slate-900">
                  {cleaner.name ?? "—"}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {verified ? (
                    <span className="badge badge-success">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Verified
                    </span>
                  ) : (
                    <span className="badge badge-neutral">Unverified</span>
                  )}
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
                </div>
              </div>
            </div>

            <div className="surface-muted px-4 py-1">
              <div className="detail-row">
                <span className="detail-label">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Phone
                </span>
                <span className="detail-value">{cleaner.phone ?? "—"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Joined
                </span>
                <span className="detail-value">
                  {new Date(cleaner.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Areas Served
                </span>
                <span className="detail-value">
                  {(d?.areas_served ?? []).join(", ") || "—"}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Verified At
                </span>
                <span className="detail-value">
                  {d?.verified_at
                    ? new Date(d.verified_at).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="stat-card">
              <span className="stat-label">Jobs Completed</span>
              <span className="stat-value">{completed}</span>
              <span className="stat-sub">of {totalJobs} total</span>
            </div>
            <div className="stat-card stat-card-accent">
              <span className="stat-label">Avg Rating</span>
              <span className="stat-value inline-flex items-center gap-1.5">
                {avgRating !== null && (
                  <Star
                    className="h-5 w-5 text-amber-400"
                    fill="currentColor"
                    aria-hidden="true"
                  />
                )}
                {avgRating ?? "—"}
              </span>
              <span className="stat-sub">
                {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Cancel Rate</span>
              <span className="stat-value">{cancelRate}%</span>
              <span className="stat-sub">{cancelled} cancelled</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Acceptance Rate</span>
              <span className="stat-value">{acceptRate}%</span>
              <span className="stat-sub">
                {acceptedOffers} of {totalOffers} offers
              </span>
            </div>
          </div>

          {/* Booking History */}
          <div className="card card-flush overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 pb-3 pt-5">
              <span className="icon-tile icon-tile-sm icon-tile-soft">
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 className="section-title">Booking History</h2>
            </div>
            {(bookings ?? []).length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">
                  <CalendarClock className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="empty-state-title">No bookings yet</p>
                <p className="empty-state-text">
                  This cleaner has not been assigned to any bookings.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Area</th>
                      <th>Scheduled</th>
                      <th className="num">Total</th>
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
                          <td>{customer?.name ?? "—"}</td>
                          <td>
                            <span className={bookingBadgeClass(b.status)}>
                              {bookingStatusLabel(b.status)}
                            </span>
                          </td>
                          <td>{b.area ?? "—"}</td>
                          <td className="text-xs text-slate-500">
                            {b.scheduled_at
                              ? new Date(b.scheduled_at).toLocaleString()
                              : "—"}
                          </td>
                          <td className="num">
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
          </div>

          {/* Reviews */}
          <div className="card">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="icon-tile icon-tile-sm icon-tile-soft">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 className="section-title">Reviews ({reviewCount})</h2>
            </div>
            {reviewCount === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">
                  <Star className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="empty-state-title">No reviews yet</p>
                <p className="empty-state-text">
                  Customer reviews for this cleaner will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(reviews ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                        <Star
                          className="h-4 w-4 text-amber-400"
                          fill="currentColor"
                          aria-hidden="true"
                        />
                        {r.rating}/5
                      </span>
                      <span className="text-xs text-slate-400">
                        by {customerByBooking.get(r.booking_id) ?? "A customer"} ·{" "}
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                      <Link
                        href={`/admin/bookings/${r.booking_id}`}
                        className="link-accent ml-auto text-xs"
                      >
                        Booking
                      </Link>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-slate-700">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* Verification & status actions */}
          <div className="card flex flex-col gap-3">
            {!verified && (
              <div className="alert alert-warning">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                <span>This cleaner has not been ID-verified yet.</span>
              </div>
            )}
            {!active && (
              <div className="alert alert-error">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                <span>Inactive — this cleaner won&apos;t receive job offers.</span>
              </div>
            )}
            <form
              action={async () => {
                "use server";
                await setCleanerVerified(id, !verified);
              }}
            >
              <ConfirmSubmit
                message={
                  verified
                    ? "Remove this cleaner's ID-verified status?"
                    : "Mark this cleaner as ID-verified?"
                }
                className="btn-base btn-secondary w-full"
                pendingText="Saving…"
              >
                {verified ? "Unverify" : "Verify"}
              </ConfirmSubmit>
            </form>
            <form
              action={async () => {
                "use server";
                await setCleanerActive(id, !active);
              }}
            >
              <ConfirmSubmit
                message={
                  active
                    ? "Deactivate this cleaner? They will stop receiving job offers."
                    : "Reactivate this cleaner? They will start receiving job offers again."
                }
                className={`btn-base w-full ${
                  active
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
                pendingText="Saving…"
              >
                {active ? "Deactivate" : "Activate"}
              </ConfirmSubmit>
            </form>
          </div>
        </aside>
      </div>
    </main>
  );
}
