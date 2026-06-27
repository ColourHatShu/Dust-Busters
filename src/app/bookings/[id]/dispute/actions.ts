"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function openDispute(
  bookingId: string,
  category: string,
  description: string
) {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();

  // Send the customer back to the booking with a friendly message rather than
  // crashing to the error boundary. (redirect() throws NEXT_REDIRECT, so these
  // calls must stay OUT of the try/catch around the RPC below.)
  const disputeError = (msg: string) =>
    redirect(`/bookings/${bookingId}?disputeError=${encodeURIComponent(msg)}`);

  // Verify customer owns the booking
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.customer_id !== user.id) {
    disputeError("We couldn't find that booking.");
    return;
  }

  // A duplicate dispute, benign edge state, or any other DB error shouldn't
  // crash the page — log it and send the customer back to the booking.
  let failed = false;
  try {
    const { error } = await supabase.rpc("open_dispute", {
      p_booking_id: bookingId,
      p_category: category,
      p_description: description,
    });
    if (error) {
      console.error("openDispute failed:", error.message);
      failed = true;
    }
  } catch (e) {
    console.error("openDispute threw:", e);
    failed = true;
  }

  if (failed) {
    disputeError("We couldn't open that dispute — it may already have been reported.");
    return;
  }

  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/bookings/${bookingId}`);
}
