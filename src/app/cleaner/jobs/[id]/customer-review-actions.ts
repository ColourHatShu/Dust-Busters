"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function submitCustomerReview(
  bookingId: string,
  customerId: string,
  formData: FormData,
) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "cleaner") redirect("/cleaner/onboard");

  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const supabase = await createClient();
  // RLS verifies the caller is the booking's cleaner and the job is finished.
  const { error } = await supabase.from("customer_reviews").insert({
    booking_id: bookingId,
    customer_id: customerId,
    cleaner_id: user.id,
    rating,
    comment,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/cleaner/jobs/${bookingId}`);
}
