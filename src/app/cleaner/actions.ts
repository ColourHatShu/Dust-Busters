"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function acceptJob(bookingId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_offer", {
    p_booking_id: bookingId,
  });
  if (error) {
    // Double-booking guard (0011) raises this when the cleaner already holds an
    // overlapping job — surface it as a friendly notice instead of a crash.
    if (error.message.includes("SCHEDULE_CONFLICT")) {
      redirect("/cleaner/jobs?notice=conflict");
    }
    throw new Error(error.message);
  }
  revalidatePath("/cleaner/jobs");
  return data === true;
}

export async function setAvailability(accepting: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("cleaner_details")
    .update({ accepting_jobs: accepting })
    .eq("profile_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/cleaner/jobs");
}

export async function declineJob(bookingId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_offer", {
    p_booking_id: bookingId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/cleaner/jobs");
}

export async function startJob(bookingId: string) {
  const supabase = await createClient();
  await supabase.rpc("start_job", { p_booking_id: bookingId });
  revalidatePath("/cleaner/jobs");
}

export async function completeJob(bookingId: string) {
  const supabase = await createClient();
  await supabase.rpc("complete_job", { p_booking_id: bookingId });
  revalidatePath("/cleaner/jobs");
}
