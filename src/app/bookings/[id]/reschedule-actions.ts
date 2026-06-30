"use server";

import { createClient } from "@/lib/supabase/server";
import { parseBookingDate } from "@/lib/booking";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Reschedule a booking to a new date/time before a deposit locks it in. The RPC
// (0031) re-validates ownership, status, and lead time, and re-rings cleaners for
// the new time. On failure we redirect back with a banner instead of crashing
// (redirect() throws NEXT_REDIRECT, so it must stay out of any try/catch).
export async function rescheduleBooking(bookingId: string, scheduledLocal: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rescheduleError = (msg: string) =>
    redirect(`/bookings/${bookingId}?rescheduleError=${encodeURIComponent(msg)}`);

  // Interpret the datetime-local value as Pacific wall-time (same as /book).
  const when = parseBookingDate(scheduledLocal);
  if (Number.isNaN(when.getTime())) {
    rescheduleError("Please choose a valid date and time.");
  }

  const { error } = await supabase.rpc("reschedule_booking", {
    p_booking_id: bookingId,
    p_scheduled_at: when.toISOString(),
  });
  if (error) {
    console.error("rescheduleBooking failed:", error.message);
    rescheduleError(
      error.message.includes("15 minutes")
        ? "Please choose a time at least 15 minutes from now."
        : "We couldn't reschedule that booking. It may no longer be eligible.",
    );
  }

  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/bookings/${bookingId}?rescheduled=1`);
}
