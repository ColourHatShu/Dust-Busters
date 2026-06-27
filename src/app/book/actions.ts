"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AREAS } from "@/lib/areas";
import { validateBooking } from "@/lib/booking";

export type BookingFormState = { error?: string } | undefined;

// useActionState-style action: returns a validation/RPC error (shown inline on
// the form) instead of throwing (which crashed to the error boundary).
export async function submitBooking(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const area = String(formData.get("area"));
  const fullAddress = String(formData.get("full_address")).trim();
  const preferredCleaner =
    String(formData.get("preferred_cleaner") || "") || null;

  // Authoritative server-side validation (the client hints aren't trusted).
  const v = validateBooking({
    scheduledLocal: String(formData.get("scheduled_at")),
    hours: Number(formData.get("hours")),
    area,
    fullAddress,
    nowMs: Date.now(),
    areas: AREAS,
  });
  if (!v.ok) return { error: v.error };

  const { data: bookingId, error } = await supabase.rpc("request_booking", {
    p_scheduled_at: v.scheduledISO,
    p_hours: Number(formData.get("hours")),
    p_area: area,
    p_full_address: fullAddress,
    p_preferred_cleaner: preferredCleaner,
  });

  if (error) return { error: error.message };
  redirect(`/bookings/${bookingId}`);
}
