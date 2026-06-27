"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe, CURRENCY, baseUrl } from "@/lib/stripe";

type PayType = "deposit" | "balance";

// Creates a Stripe Checkout session for the deposit or balance, then redirects
// the customer to Stripe. The booking is only advanced once Stripe confirms
// payment via the webhook (never trust the browser redirect alone).
async function startCheckout(bookingId: string, type: PayType) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Send the customer back to the booking with a friendly message rather than
  // crashing to the error boundary. (redirect() throws NEXT_REDIRECT, so these
  // calls must stay OUT of the try/catch around the Stripe call below.)
  const payError = (msg: string) =>
    redirect(`/bookings/${bookingId}?payError=${encodeURIComponent(msg)}`);

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, hours, area, total_amount, deposit_amount, balance_amount, customer_id")
    .eq("id", bookingId)
    .single();
  if (!booking || booking.customer_id !== user.id) {
    payError("We couldn't find that booking.");
    return;
  }
  if (type === "deposit" && booking.status !== "accepted") {
    payError("This deposit can't be paid right now — the booking has moved on.");
    return;
  }
  if (type === "balance" && booking.status !== "completed") {
    payError("The balance isn't payable yet.");
    return;
  }

  const amount = type === "deposit" ? booking.deposit_amount : booking.balance_amount;
  const label =
    type === "deposit"
      ? `Deposit for ${booking.hours}h cleaning in ${booking.area}`
      : `Balance for ${booking.hours}h cleaning in ${booking.area}`;

  let url: string | null = null;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: Math.round(Number(amount) * 100),
            product_data: { name: label },
          },
        },
      ],
      metadata: { booking_id: booking.id, type },
      success_url: `${baseUrl()}/bookings/${booking.id}?paid=1`,
      cancel_url: `${baseUrl()}/bookings/${booking.id}`,
    });
    url = session.url;
  } catch (e) {
    console.error("Stripe checkout failed:", e);
  }

  if (!url) {
    payError("We couldn't start checkout just now. Please try again.");
    return;
  }
  redirect(url);
}

export async function payDeposit(bookingId: string) {
  await startCheckout(bookingId, "deposit");
}

export async function payBalance(bookingId: string) {
  await startCheckout(bookingId, "balance");
}
