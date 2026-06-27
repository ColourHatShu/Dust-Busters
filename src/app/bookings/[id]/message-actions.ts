"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function sendMessage(bookingId: string, body: string) {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  // Validate without crashing the page. The MessagePanel client already guards
  // empty sends and caps input at 1000 chars; mirror that here and simply return
  // on bad input rather than throwing (the panel keeps its own local state).
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 1000) return;

  const supabase = await createClient();

  const { error } = await supabase.rpc("send_booking_message", {
    p_booking_id: bookingId,
    p_body: trimmed,
  });

  // A failed send shouldn't bubble to the global error boundary. Log it and
  // return — the realtime channel and revalidate keep the panel correct.
  if (error) {
    console.error("sendMessage failed:", error.message);
    return;
  }

  revalidatePath(`/bookings/${bookingId}`);
}
