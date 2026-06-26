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
  // NOTE: disputes has no `updated_at` column — including it made every update
  // fail, so admins couldn't resolve disputes at all.
  await svc
    .from("disputes")
    .update({
      status,
      resolution: resolution || null,
      resolved_at: ["resolved", "closed"].includes(status)
        ? new Date().toISOString()
        : null,
    })
    .eq("id", disputeId);

  revalidatePath(`/admin/disputes/${disputeId}`);
  revalidatePath("/admin/disputes");
}

export async function issueRefund(formData: FormData) {
  await assertAdmin();
  const bookingId = formData.get("booking_id") as string;
  const paymentId = formData.get("payment_id") as string;
  const amount = Number(formData.get("amount"));
  const reason = formData.get("reason") as string;
  const disputeId = formData.get("dispute_id") as string;
  const stripePaymentIntentId = formData.get("stripe_payment_intent_id") as string;

  // Issue Stripe refund if we have a payment intent
  let stripeRefundId: string | null = null;
  if (stripePaymentIntentId && stripePaymentIntentId !== "none") {
    const refund = await stripe.refunds.create({
      payment_intent: stripePaymentIntentId,
      amount: Math.round(amount * 100), // cents
      reason: "requested_by_customer",
    });
    stripeRefundId = refund.id;
  }

  const svc = serviceClient();
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
  if (paymentId) {
    await svc.from("payments").update({ status: "refunded" }).eq("id", paymentId);
  }

  revalidatePath(`/admin/disputes/${disputeId}`);
  revalidatePath(`/admin/bookings/${bookingId}`);
}
