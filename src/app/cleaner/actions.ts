"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function acceptJob(bookingId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_offer", {
    p_booking_id: bookingId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/cleaner/jobs");
  return data === true;
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
