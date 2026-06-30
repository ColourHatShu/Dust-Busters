"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();

  const updates: Record<string, string> = {};
  if (name) updates.name = name;
  if (phone !== undefined) updates.phone = phone;

  if (Object.keys(updates).length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/account");
}

export async function addAddress(formData: FormData) {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const label = (formData.get("label") as string)?.trim() || null;
  const fullAddress = (formData.get("full_address") as string)?.trim();
  if (!fullAddress || fullAddress.length < 5) {
    throw new Error("Please enter a full address.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_addresses")
    .insert({ customer_id: user.id, label, full_address: fullAddress });
  if (error) throw new Error(error.message);

  revalidatePath("/account");
}

export async function deleteAddress(id: string) {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  await supabase
    .from("saved_addresses")
    .delete()
    .eq("id", id)
    .eq("customer_id", user.id);

  revalidatePath("/account");
}

export async function removeFavorite(cleanerId: string) {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  await supabase
    .from("customer_favorites")
    .delete()
    .eq("customer_id", user.id)
    .eq("cleaner_id", cleanerId);

  revalidatePath("/account");
}

// Stop a recurring plan: deactivate it (RLS scopes to the owner). Any already-
// created upcoming booking is left untouched — the customer manages it normally.
export async function stopRecurring(seriesId: string) {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  await supabase
    .from("recurring_series")
    .update({ active: false })
    .eq("id", seriesId)
    .eq("customer_id", user.id);

  revalidatePath("/account");
}
