"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// service_addons RLS allows is_admin() for all ops, so the authenticated admin's
// server client manages the menu directly (no service key).
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

const err = (msg: string) =>
  redirect(`/admin/addons?error=${encodeURIComponent(msg)}`);

export async function createAddon(formData: FormData) {
  const supabase = await assertAdmin();

  const key = String(formData.get("key") ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const label = String(formData.get("label") ?? "").trim();
  const price = Number(formData.get("price"));
  const sortRaw = String(formData.get("sort") ?? "").trim();

  if (!/^[a-z0-9_]{2,40}$/.test(key)) {
    err("Key must be 2–40 letters, numbers, or underscores.");
  }
  if (label.length < 2) err("Enter a label.");
  if (!(price >= 0)) err("Price must be 0 or more.");
  const sort = sortRaw ? Math.floor(Number(sortRaw)) : 0;

  const { error } = await supabase
    .from("service_addons")
    .insert({ key, label, price, sort, active: true });
  if (error) {
    err(
      error.message.toLowerCase().includes("duplicate")
        ? `Key "${key}" already exists.`
        : error.message,
    );
  }
  redirect("/admin/addons?created=1");
}

export async function toggleAddon(id: string, active: boolean) {
  const supabase = await assertAdmin();
  await supabase.from("service_addons").update({ active }).eq("id", id);
  revalidatePath("/admin/addons");
}
