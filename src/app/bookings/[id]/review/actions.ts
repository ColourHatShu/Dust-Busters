"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function submitReview(bookingId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").insert({
    booking_id: bookingId,
    rating: Number(formData.get("rating")),
    comment: String(formData.get("comment")),
  });
  if (error) throw new Error(error.message);
  redirect(`/bookings/${bookingId}`);
}
