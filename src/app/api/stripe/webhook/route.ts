import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

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
        await db
          .from("bookings")
          .update({ status: "deposit_paid" })
          .eq("id", bookingId)
          .eq("status", "accepted");
      } else {
        await db
          .from("bookings")
          .update({ status: "balance_paid" })
          .eq("id", bookingId)
          .eq("status", "completed");
      }
    }
  }

  return NextResponse.json({ received: true });
}
