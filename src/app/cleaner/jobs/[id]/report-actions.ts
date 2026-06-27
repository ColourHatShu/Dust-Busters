"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function reportProblem(bookingId: string, formData: FormData) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "cleaner") redirect("/cleaner/onboard");

  // Send the cleaner back to the job with a friendly message rather than
  // crashing to the error boundary. (redirect() throws NEXT_REDIRECT, so these
  // calls must stay OUT of any try/catch around the DB work below.)
  const reportError = (msg: string) =>
    redirect(`/cleaner/jobs/${bookingId}?reportError=${encodeURIComponent(msg)}`);

  const category = String(formData.get("category") ?? "other");
  const description = String(formData.get("description") ?? "").trim();
  if (!description) {
    reportError("Please describe the problem before submitting.");
    return;
  }

  const supabase = await createClient();

  // Verify this cleaner is the one assigned to the booking.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, cleaner_id")
    .eq("id", bookingId)
    .single();
  if (!booking || booking.cleaner_id !== user.id) {
    reportError("We couldn't find that job, or it's no longer assigned to you.");
    return;
  }

  // open_dispute (0014) authorises the assigned cleaner and records raised_by.
  // A duplicate (already reported) or any other error shouldn't crash — log it
  // and return the cleaner to the job, which reflects the real state.
  const { error } = await supabase.rpc("open_dispute", {
    p_booking_id: bookingId,
    p_category: category,
    p_description: description,
  });
  if (error) {
    console.error("reportProblem failed:", error.message);
    reportError("We couldn't submit that report just now. Please try again.");
    return;
  }

  revalidatePath(`/cleaner/jobs/${bookingId}`);
  redirect(`/cleaner/jobs/${bookingId}?reported=1`);
}
