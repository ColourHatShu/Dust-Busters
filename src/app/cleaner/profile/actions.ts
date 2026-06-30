"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateCleanerProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify cleaner role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "cleaner") redirect("/cleaner/onboard");

  const name = formData.get("name")?.toString().trim() ?? "";
  const phone = formData.get("phone")?.toString().trim() ?? "";
  const areasRaw = formData.getAll("areas").map(String);
  // "About me" shown to customers — trim + cap length (the column is free text).
  const bio = (formData.get("bio")?.toString().trim() ?? "").slice(0, 600);

  // Update profile name + phone
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ name, phone: phone || null })
    .eq("id", user.id);

  if (profileError) throw new Error(profileError.message);

  // Update areas_served + bio in cleaner_details
  const { error: detailsError } = await supabase
    .from("cleaner_details")
    .update({ areas_served: areasRaw, bio: bio || null })
    .eq("profile_id", user.id);

  if (detailsError) throw new Error(detailsError.message);

  revalidatePath("/cleaner/profile");
}
