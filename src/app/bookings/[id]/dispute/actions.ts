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

  // Verify customer owns the booking
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.customer_id !== user.id) {
    throw new Error("Booking not found or access denied.");
  }

  const { error } = await supabase.rpc("open_dispute", {
    p_booking_id: bookingId,
    p_category: category,
    p_description: description,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/bookings/${bookingId}`);
}
