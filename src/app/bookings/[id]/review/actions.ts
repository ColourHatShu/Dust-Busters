"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function submitReview(bookingId: string, formData: FormData) {
  const supabase = await createClient();

  const rating = Number(formData.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    redirect(
      `/bookings/${bookingId}?reviewError=${encodeURIComponent(
        "Please choose a star rating first.",
      )}`,
    );
  }
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const { error } = await supabase.from("reviews").insert({
    booking_id: bookingId,
    rating,
    comment,
  });
  // A duplicate (already reviewed) or any other error shouldn't crash — return to
  // the booking, which reflects the real state.
  if (error) console.error("submitReview failed:", error.message);
  redirect(`/bookings/${bookingId}`);
}
