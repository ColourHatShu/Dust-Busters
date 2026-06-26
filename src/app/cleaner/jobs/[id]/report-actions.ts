"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function reportProblem(bookingId: string, formData: FormData) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "cleaner") redirect("/cleaner/onboard");

  const category = String(formData.get("category") ?? "other");
  const description = String(formData.get("description") ?? "").trim();
  if (!description) throw new Error("Please describe the problem.");

  const supabase = await createClient();

  // Verify this cleaner is the one assigned to the booking.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, cleaner_id")
    .eq("id", bookingId)
    .single();
  if (!booking || booking.cleaner_id !== user.id) {
    throw new Error("Booking not found or access denied.");
  }

  // open_dispute (0014) authorises the assigned cleaner and records raised_by.
  const { error } = await supabase.rpc("open_dispute", {
    p_booking_id: bookingId,
    p_category: category,
    p_description: description,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/cleaner/jobs/${bookingId}`);
  redirect(`/cleaner/jobs/${bookingId}?reported=1`);
}
