"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function submitBooking(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const scheduledLocal = String(formData.get("scheduled_at"));
  const hours = Number(formData.get("hours"));
  const area = String(formData.get("area"));
  const fullAddress = String(formData.get("full_address"));

  const { data: bookingId, error } = await supabase.rpc("request_booking", {
    p_scheduled_at: new Date(scheduledLocal).toISOString(),
    p_hours: hours,
    p_area: area,
    p_full_address: fullAddress,
  });

  if (error) throw new Error(error.message);
  redirect(`/bookings/${bookingId}`);
}
