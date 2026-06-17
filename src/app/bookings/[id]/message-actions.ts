"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function sendMessage(bookingId: string, body: string) {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message cannot be empty.");

  const supabase = await createClient();

  const { error } = await supabase.rpc("send_booking_message", {
    p_booking_id: bookingId,
    p_body: trimmed,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/bookings/${bookingId}`);
}
