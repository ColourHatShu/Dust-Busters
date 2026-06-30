import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { paymentBadgeClass } from "@/lib/status";
import PrintButton from "./PrintButton";

export const metadata = { title: "Receipt" };

type PaymentRow = {
  id: string;
  type: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  // RLS scopes this to the customer's own booking.
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, scheduled_at, hours, area, total_amount, deposit_amount, balance_amount, created_at",
    )
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (!booking) notFound();

  const { data: payments } = await supabase
    .from("payments")
    .select("id, type, amount, status, paid_at, created_at")
    .eq("booking_id", id)
    .order("created_at", { ascending: true })
    .returns<PaymentRow[]>();
  const rows = payments ?? [];

  // A refunded deposit nets to $0 (the negative refund row is for display only).
  const netPaid = rows
    .filter((p) => p.status === "paid" && p.type !== "refund")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const label = (t: string) =>
    t === "deposit"
      ? "Deposit"
      : t === "balance"
        ? "Balance"
        : t === "refund"
          ? "Refund"
          : t;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3 print-hide">
        <Link
          href={`/bookings/${id}`}
          className="link-subtle inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to booking
        </Link>
        <PrintButton />
      </div>

      <article className="card space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <span className="icon-tile" aria-hidden="true">
              DB
            </span>
            <div>
              <p className="text-lg font-bold text-slate-900">Dust Busters</p>
              <p className="text-xs text-slate-500">
                Home cleaning · Comox Valley, BC
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="eyebrow-label">Receipt</p>
            <p className="font-mono text-sm text-slate-700">
              #{String(booking.id).slice(0, 8)}
            </p>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="eyebrow-label">Billed to</p>
            <p className="mt-1 text-slate-800">{profile?.name ?? "Customer"}</p>
          </div>
          <div className="text-right">
            <p className="eyebrow-label">Booked</p>
            <p className="mt-1 text-slate-800">
              {new Date(booking.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="eyebrow-label">Service</p>
            <p className="mt-1 text-slate-800">
              {booking.hours}h cleaning · {booking.area}
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow-label">Scheduled</p>
            <p className="mt-1 text-slate-800">
              {new Date(booking.scheduled_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Line items */}
        <div className="border-t border-slate-200 pt-5">
          <p className="eyebrow-label mb-2">Payments</p>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">
              No payments recorded yet for this booking.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-2 text-slate-800">{label(p.type)}</td>
                    <td className="py-2 text-slate-500">
                      {new Date(p.paid_at ?? p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      <span className={`${paymentBadgeClass(p.status)} capitalize`}>
                        {p.status}
                      </span>
                    </td>
                    <td
                      className={`py-2 text-right font-medium tabular-nums ${
                        Number(p.amount) < 0 ? "text-amber-600" : "text-slate-900"
                      }`}
                    >
                      {Number(p.amount) < 0 ? "−" : ""}$
                      {Math.abs(Number(p.amount)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between border-t-2 border-slate-200 pt-4">
          <span className="font-semibold text-slate-700">Net paid</span>
          <span className="amount-lg">${netPaid.toFixed(2)}</span>
        </div>

        <p className="text-xs text-slate-400">
          Booking total ${Number(booking.total_amount).toFixed(2)} (deposit $
          {Number(booking.deposit_amount).toFixed(2)} + balance $
          {Number(booking.balance_amount).toFixed(2)}). Payments processed
          securely via Stripe. Thank you for choosing Dust Busters.
        </p>
      </article>
    </main>
  );
}
