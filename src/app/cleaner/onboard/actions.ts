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

  const { error: roleErr } = await supabase
    .from("profiles")
    .update({ role: "cleaner" })
    .eq("id", user.id);
  if (roleErr) throw new Error(roleErr.message);

  const { error: detailsErr } = await supabase.from("cleaner_details").upsert({
    profile_id: user.id,
    areas_served: areas,
    active: true,
  });
  if (detailsErr) throw new Error(detailsErr.message);

  redirect("/cleaner/jobs");
}
