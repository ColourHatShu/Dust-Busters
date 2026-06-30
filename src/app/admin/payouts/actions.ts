"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");
  return supabase;
}

// Record (NOT transfer) that a cleaner's outstanding payouts have been paid out
// off-system. Stamps payout_paid_at on every settled, still-owed booking of theirs.
export async function markCleanerPaid(cleanerId: string) {
  const supabase = await assertAdmin();
  await supabase
    .from("bookings")
    .update({ payout_paid_at: new Date().toISOString() })
    .eq("cleaner_id", cleanerId)
    .is("payout_paid_at", null)
    .in("status", ["balance_paid", "closed"]);
  revalidatePath("/admin/payouts");
}
