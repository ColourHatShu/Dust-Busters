"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Toggle a cleaner as the customer's favorite (RLS scopes rows to auth.uid()).
export async function toggleFavorite(
  bookingId: string,
  cleanerId: string,
  isFav: boolean,
) {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  if (isFav) {
    await supabase
      .from("customer_favorites")
      .delete()
      .eq("customer_id", user.id)
      .eq("cleaner_id", cleanerId);
  } else {
    await supabase
      .from("customer_favorites")
      .insert({ customer_id: user.id, cleaner_id: cleanerId });
  }
  revalidatePath(`/bookings/${bookingId}`);
}
