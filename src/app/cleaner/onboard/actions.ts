"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function becomeCleaner(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const areas = formData.getAll("areas").map(String);

  await supabase.from("profiles").update({ role: "cleaner" }).eq("id", user.id);
  await supabase.from("cleaner_details").upsert({
    profile_id: user.id,
    areas_served: areas,
    active: true,
  });

  redirect("/cleaner/jobs");
}
