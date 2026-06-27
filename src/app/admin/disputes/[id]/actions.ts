"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/stripe";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function assertAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Forbidden");
}

export async function updateDisputeStatus(formData: FormData) {
  await assertAdmin();
  const disputeId = formData.get("dispute_id") as string;
  const status = formData.get("status") as string;
  const resolution = formData.get("resolution") as string;

  const svc = serviceClient();
  const { data: dispute } = await svc
    .from("disputes")
    .select("booking_id")
    .eq("id", disputeId)
    .single();

  // NOTE: disputes has no `updated_at` column — including it made every update
  // fail, so admins couldn't resolve disputes at all.
  const closing = ["resolved", "closed"].includes(status);
  await svc
    .from("disputes")
    .update({
      status,
      resolution: resolution || null,
      resolved_at: closing ? new Date().toISOString() : null,
    })
    .eq("id", disputeId);

  // Releasing the dispute must un-stick the booking — otherwise it stays in
  // 'disputed' forever. open_dispute only parks a 'completed' booking in
  // 'disputed' (verified in 0014), so restore it to 'completed'. The
  // .eq("status","disputed") guard ensures we never clobber another state.
  if (closing && dispute?.booking_id) {
    await svc
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", dispute.booking_id)
      .eq("status", "disputed");
  }

  revalidatePath(`/admin/disputes/${disputeId}`);
  revalidatePath("/admin/disputes");
  if (dispute?.booking_id) {
    revalidatePath(`/admin/bookings/${dispute.booking_id}`);
  }
}

export async function issueRefund(formData: FormData) {
  await assertAdmin();
  const bookingId = formData.get("booking_id") as string;
  const paymentId = formData.get("payment_id") as string;
  const amount = Number(formData.get("amount"));
  const reason = formData.get("reason") as string;
  const disputeId = formData.get("dispute_id") as string;

  const svc = serviceClient();

  // Refund the ACTUALLY-selected payment (scoped to this booking) — not a pinned
  // payments[0], which refunded the wrong charge on multi-payment bookings.
  const { data: payment, error: payErr } = await svc
    .from("payments")
    .select("id, amount, stripe_payment_intent_id")
    .eq("id", paymentId)
    .eq("booking_id", bookingId)
    .neq("type", "refund")
    .single();
  if (payErr || !payment) {
    throw new Error("Selected payment not found for this booking.");
  }
  // Validate the amount server-side (positive, at most the charged amount).
  if (!(amount > 0) || amount > Number(payment.amount)) {
    throw new Error(
      "Refund amount must be positive and no more than the payment amount.",
    );
  }

  // Issue the Stripe refund against THAT payment's intent.
  let stripeRefundId: string | null = null;
  if (payment.stripe_payment_intent_id) {
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: Math.round(amount * 100), // cents
      reason: "requested_by_customer",
    });
    stripeRefundId = refund.id;
  }

  // Record the refund as its own payment row. Correct columns: `type` (not
  // payment_type), `notes`; no `updated_at`. Requires the 'refund' payment_type
  // value added in migration 0013.
  const { error: insertErr } = await svc.from("payments").insert({
    booking_id: bookingId,
    type: "refund",
    amount: -Math.abs(amount),
    status: "paid",
    paid_at: new Date().toISOString(),
    stripe_payment_intent_id: stripeRefundId,
    notes: reason,
  });
  if (insertErr) throw new Error(`Refund recorded in Stripe but DB write failed: ${insertErr.message}`);

  // Mark the original payment as refunded so the dispute/booking views are clear.
  await svc.from("payments").update({ status: "refunded" }).eq("id", payment.id);

  revalidatePath(`/admin/disputes/${disputeId}`);
  revalidatePath(`/admin/bookings/${bookingId}`);
}
