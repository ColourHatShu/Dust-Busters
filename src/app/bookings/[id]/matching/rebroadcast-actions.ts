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
  if (error) throw new Error(error.message);

  revalidatePath(`/bookings/${bookingId}`);
}
