"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizePromoCode } from "@/lib/promo";

// promo_codes RLS allows is_admin() for all ops, so the authenticated admin's
// server client can manage codes directly (no service key needed).
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
  redirect(`/admin/promos?error=${encodeURIComponent(msg)}`);

export async function createPromo(formData: FormData) {
  const supabase = await assertAdmin();

  const code = normalizePromoCode(formData.get("code") as string);
  const kind = String(formData.get("kind") ?? "");
  const value = Number(formData.get("value"));
  const maxUsesRaw = String(formData.get("max_uses") ?? "").trim();
  const expiresRaw = String(formData.get("expires_at") ?? "").trim();
  const firstCleanOnly = formData.get("first_clean_only") === "on";

  if (!/^[A-Z0-9]{3,32}$/.test(code)) {
    err("Code must be 3–32 letters or numbers (no spaces).");
  }
  if (!["percent", "amount"].includes(kind)) err("Choose a discount type.");
  if (!(value > 0)) err("Value must be greater than 0.");
  if (kind === "percent" && value > 100) err("Percent can't exceed 100.");

  const max_uses = maxUsesRaw ? Math.max(1, Math.floor(Number(maxUsesRaw))) : null;
  const expires_at = /^\d{4}-\d{2}-\d{2}$/.test(expiresRaw)
    ? `${expiresRaw}T23:59:59`
    : null;

  const { error } = await supabase.from("promo_codes").insert({
    code,
    kind,
    value,
    max_uses,
    expires_at,
    first_clean_only: firstCleanOnly,
    active: true,
  });
  if (error) {
    err(
      error.message.toLowerCase().includes("duplicate")
        ? `Code "${code}" already exists.`
        : error.message,
    );
  }
  redirect("/admin/promos?created=1");
}

export async function togglePromo(id: string, active: boolean) {
  const supabase = await assertAdmin();
  await supabase.from("promo_codes").update({ active }).eq("id", id);
  revalidatePath("/admin/promos");
}
