"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { createNotification } from "@/lib/notifications";
import { FREE_CANCEL_HOURS, isDepositRefundable } from "@/lib/booking";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function cancelBooking(bookingId: string, reason: string) {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id, cleaner_id, status, scheduled_at, deposit_amount")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.customer_id !== user.id) {
    throw new Error("Booking not found or access denied.");
  }

  // Decide the refund outcome BEFORE cancelling. A deposit only exists once the
  // booking reached deposit_paid; otherwise there is nothing to refund.
  let outcome: "refunded" | "forfeit" | "1" = "1";

  if (booking.status === "deposit_paid") {
    if (
      isDepositRefundable(new Date(booking.scheduled_at).getTime(), Date.now())
    ) {
      const svc = serviceClient();
      const { data: deposit } = await svc
        .from("payments")
        .select("id, amount, stripe_payment_intent_id")
        .eq("booking_id", bookingId)
        .eq("type", "deposit")
        .eq("status", "paid")
        .maybeSingle();

      if (deposit?.stripe_payment_intent_id) {
        const refund = await stripe.refunds.create({
          payment_intent: deposit.stripe_payment_intent_id,
          reason: "requested_by_customer",
        });
        const { error: recErr } = await svc.from("payments").insert({
          booking_id: bookingId,
          type: "refund",
          amount: -Math.abs(Number(deposit.amount)),
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: refund.id,
          notes: `Cancellation refund (>=${FREE_CANCEL_HOURS}h): ${reason}`,
        });
        if (recErr) {
          throw new Error(
            `Refund issued in Stripe but DB record failed: ${recErr.message}`,
          );
        }
        await svc
          .from("payments")
          .update({ status: "refunded" })
          .eq("id", deposit.id);
        outcome = "refunded";
      } else {
        // Deposit paid but no payment-intent on file — can't auto-refund.
        outcome = "forfeit";
      }
    } else {
      outcome = "forfeit";
    }
  }

  const { error } = await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason,
    p_by: "customer",
  });
  if (error) throw new Error(error.message);

  // Let the assigned cleaner know their job was cancelled.
  if (booking.cleaner_id) {
    await createNotification(
      booking.cleaner_id,
      "booking_cancelled",
      "A job was cancelled",
      "A customer cancelled a booking you had accepted.",
      bookingId,
    );
  }

  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/bookings/${bookingId}?cancelled=${outcome}`);
}
