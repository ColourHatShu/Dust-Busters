"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function cancelBooking(bookingId: string, reason: string) {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();

  // Verify the user owns the booking
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.customer_id !== user.id) {
    throw new Error("Booking not found or access denied.");
  }

  const { error } = await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason,
    p_by: "customer",
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/bookings/${bookingId}`);
}
