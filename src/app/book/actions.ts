"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AREAS } from "@/lib/areas";

export async function submitBooking(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const scheduledLocal = String(formData.get("scheduled_at"));
  const hours = Number(formData.get("hours"));
  const area = String(formData.get("area"));
  const fullAddress = String(formData.get("full_address")).trim();

  // Server-side validation — the client hints (min attr) are not authoritative.
  const scheduled = new Date(scheduledLocal);
  if (Number.isNaN(scheduled.getTime())) {
    throw new Error("Please choose a valid date and time.");
  }
  if (scheduled.getTime() < Date.now() + 15 * 60 * 1000) {
    throw new Error(
      "Please choose a date and time at least 15 minutes from now.",
    );
  }
  if (!Number.isInteger(hours) || hours < 1 || hours > 12) {
    throw new Error("Hours must be a whole number between 1 and 12.");
  }
  if (!(AREAS as readonly string[]).includes(area)) {
    throw new Error("Please choose a valid service area.");
  }
  if (fullAddress.length < 5) {
    throw new Error("Please enter your full address.");
  }

  const { data: bookingId, error } = await supabase.rpc("request_booking", {
    p_scheduled_at: scheduled.toISOString(),
    p_hours: hours,
    p_area: area,
    p_full_address: fullAddress,
  });

  if (error) throw new Error(error.message);
  redirect(`/bookings/${bookingId}`);
}
