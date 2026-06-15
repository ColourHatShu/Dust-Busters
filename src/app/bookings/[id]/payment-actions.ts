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

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, hours, area, total_amount, deposit_amount, balance_amount, customer_id")
    .eq("id", bookingId)
    .single();
  if (!booking || booking.customer_id !== user.id) throw new Error("Not found");

  if (type === "deposit" && booking.status !== "accepted")
    throw new Error("Deposit is not payable right now");
  if (type === "balance" && booking.status !== "completed")
    throw new Error("Balance is not payable right now");

  const amount = type === "deposit" ? booking.deposit_amount : booking.balance_amount;
  const label =
    type === "deposit"
      ? `Deposit for ${booking.hours}h cleaning in ${booking.area}`
      : `Balance for ${booking.hours}h cleaning in ${booking.area}`;

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

  redirect(session.url!);
}

export async function payDeposit(bookingId: string) {
  await startCheckout(bookingId, "deposit");
}

export async function payBalance(bookingId: string) {
  await startCheckout(bookingId, "balance");
}
