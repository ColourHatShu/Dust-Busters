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
