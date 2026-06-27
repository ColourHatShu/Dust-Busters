"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AREAS } from "@/lib/areas";
import { validateBooking } from "@/lib/booking";

export async function submitBooking(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const area = String(formData.get("area"));
  const fullAddress = String(formData.get("full_address")).trim();

  // Authoritative server-side validation (the client hints aren't trusted).
  const v = validateBooking({
    scheduledLocal: String(formData.get("scheduled_at")),
    hours: Number(formData.get("hours")),
    area,
    fullAddress,
    nowMs: Date.now(),
    areas: AREAS,
  });
  if (!v.ok) throw new Error(v.error);

  const { data: bookingId, error } = await supabase.rpc("request_booking", {
    p_scheduled_at: v.scheduledISO,
    p_hours: Number(formData.get("hours")),
    p_area: area,
    p_full_address: fullAddress,
  });

  if (error) throw new Error(error.message);
  redirect(`/bookings/${bookingId}`);
}
