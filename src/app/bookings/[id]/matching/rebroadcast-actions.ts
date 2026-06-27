"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function rebroadcastBooking(bookingId: string) {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { error } = await supabase.rpc("rebroadcast_booking", {
    p_booking_id: bookingId,
  });
  // Don't crash the page on a benign race (e.g. the booking already moved on);
  // the matching map re-polls and reflects the real state on its own.
  if (error) console.error("rebroadcast_booking failed:", error.message);

  revalidatePath(`/bookings/${bookingId}`);
}
