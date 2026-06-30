"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AREAS } from "@/lib/areas";
import { validateBooking } from "@/lib/booking";
import { sanitizeChecklist } from "@/lib/checklist";
import { parseFrequencyWeeks } from "@/lib/recurring";
import { normalizePromoCode } from "@/lib/promo";

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

  const notes = String(formData.get("notes") || "").trim() || null;

  // Structured cleaning scope: keep only valid task keys (never trust the client).
  const checklist = sanitizeChecklist(formData.getAll("checklist").map(String));
  const checklistArg = checklist.length ? checklist : null;
  const hours = Number(formData.get("hours"));

  // Recurring? A valid cadence creates a series (which also creates the first
  // occurrence); otherwise a one-time booking. Both return the first booking id.
  const frequencyWeeks = parseFrequencyWeeks(formData.get("repeat") as string);

  // Promo code (one-time bookings only). Validate up front so a typo'd/expired
  // code shows inline instead of silently booking at full price.
  const promo = normalizePromoCode(formData.get("promo_code") as string);
  if (promo) {
    if (frequencyWeeks) {
      return {
        error:
          "Promo codes apply to one-time bookings — remove the code or set Repeat to One-time.",
      };
    }
    const { data: vp } = await supabase.rpc("validate_promo", { p_code: promo });
    const v0 = Array.isArray(vp) ? vp[0] : vp;
    if (!v0?.valid) {
      return { error: v0?.message ?? "That promo code isn't valid." };
    }
  }

  const { data: bookingId, error } = frequencyWeeks
    ? await supabase.rpc("create_recurring_series", {
        p_first_scheduled_at: v.scheduledISO,
        p_frequency_weeks: frequencyWeeks,
        p_hours: hours,
        p_area: area,
        p_full_address: fullAddress,
        p_preferred_cleaner: preferredCleaner,
        p_notes: notes,
        p_checklist: checklistArg,
      })
    : await supabase.rpc("request_booking", {
        p_scheduled_at: v.scheduledISO,
        p_hours: hours,
        p_area: area,
        p_full_address: fullAddress,
        p_preferred_cleaner: preferredCleaner,
        p_notes: notes,
        p_checklist: checklistArg,
        p_promo_code: promo || null,
      });

  if (error) return { error: error.message };
  redirect(`/bookings/${bookingId}`);
}
