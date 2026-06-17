import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { createNotification } from "@/lib/notifications";

// Service-role client: the webhook is the only writer of payment + status
// transitions, and it must bypass RLS.
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, secret!);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature failed: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const bookingId = session.metadata?.booking_id;
      const type = session.metadata?.type as "deposit" | "balance" | undefined;

      if (bookingId && type) {
        const db = serviceClient();

        // Idempotent: a replayed checkout.session.completed event hits the unique
        // index on stripe_session_id and is ignored rather than duplicating a row.
        await db.from("payments").upsert(
          {
            booking_id: bookingId,
            type,
            stripe_session_id: session.id,
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : null,
            amount: (session.amount_total ?? 0) / 100,
            status: "paid",
            paid_at: new Date().toISOString(),
          },
          { onConflict: "stripe_session_id", ignoreDuplicates: true }
        );

        // Advance the booking only from the expected prior status (idempotent).
        if (type === "deposit") {
          const { data: booking } = await db
            .from("bookings")
            .select("id, customer_id, cleaner_id, scheduled_at")
            .eq("id", bookingId)
            .single();

          await db
            .from("bookings")
            .update({ status: "deposit_paid" })
            .eq("id", bookingId)
            .eq("status", "accepted");

          if (booking) {
            const dateStr = booking.scheduled_at
              ? new Date(booking.scheduled_at).toLocaleDateString("en-CA", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              : "your scheduled date";

            // Notify customer
            if (booking.customer_id) {
              await createNotification(
                booking.customer_id,
                "deposit_paid",
                "Deposit paid — booking confirmed",
                "Deposit paid — your booking is confirmed. See you soon!",
                bookingId
              );
            }

            // Notify cleaner
            if (booking.cleaner_id) {
              await createNotification(
                booking.cleaner_id,
                "deposit_received",
                "Deposit received — job confirmed",
                `Deposit received — job confirmed for ${dateStr}.`,
                bookingId
              );
            }
          }
        } else {
          const { data: booking } = await db
            .from("bookings")
            .select("id, cleaner_id, scheduled_at")
            .eq("id", bookingId)
            .single();

          await db
            .from("bookings")
            .update({ status: "balance_paid" })
            .eq("id", bookingId)
            .eq("status", "completed");

          if (booking?.cleaner_id) {
            const dateStr = booking.scheduled_at
              ? new Date(booking.scheduled_at).toLocaleDateString("en-CA", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              : "your recent booking";

            await createNotification(
              booking.cleaner_id,
              "balance_received",
              "Balance received",
              `Balance received for ${dateStr} booking.`,
              bookingId
            );
          }
        }
      }
    } else if (event.type === "charge.dispute.created") {
      const dispute = event.data.object;
      const paymentIntentId = dispute.payment_intent;

      if (paymentIntentId) {
        const db = serviceClient();

        // Find the payment record by payment intent
        const { data: payment } = await db
          .from("payments")
          .select("id, booking_id")
          .eq(
            "stripe_payment_intent_id",
            typeof paymentIntentId === "string" ? paymentIntentId : ""
          )
          .maybeSingle();

        if (payment?.booking_id) {
          // Mark booking as disputed (only if not already)
          await db
            .from("bookings")
            .update({ status: "disputed" })
            .eq("id", payment.booking_id)
            .neq("status", "disputed");

          // Insert dispute record
          await db.from("disputes").insert({
            booking_id: payment.booking_id,
            payment_id: payment.id,
            stripe_dispute_id: dispute.id,
            reason: dispute.reason,
            amount: dispute.amount / 100,
            status: dispute.status,
            created_at: new Date().toISOString(),
          });

          console.log(
            `[webhook] dispute created for booking ${payment.booking_id}, dispute ${dispute.id}`
          );
        }
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const paymentIntentId = charge.payment_intent;

      if (paymentIntentId) {
        const db = serviceClient();

        const { data: payment } = await db
          .from("payments")
          .select("id, booking_id")
          .eq(
            "stripe_payment_intent_id",
            typeof paymentIntentId === "string" ? paymentIntentId : ""
          )
          .maybeSingle();

        if (payment) {
          console.log(
            `[webhook] charge.refunded for payment ${payment.id}, booking ${payment.booking_id}`
          );

          // Log refund amount if available
          const refundedAmount = charge.amount_refunded / 100;
          console.log(`[webhook] refunded amount: ${refundedAmount}`);
        } else {
          console.log(
            `[webhook] charge.refunded: no payment found for intent ${paymentIntentId}`
          );
        }
      }
    }
  } catch (err) {
    console.error("[webhook] handler error:", err);
    // Still return 200 so Stripe does not retry indefinitely for non-signature errors.
    return NextResponse.json({ received: true, error: "handler_error" });
  }

  return NextResponse.json({ received: true });
}
