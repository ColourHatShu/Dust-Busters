"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Service-role client (server-only) to perform admin writes.
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function assertAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Forbidden");
}

export async function updateSettings(formData: FormData) {
  await assertAdmin();
  const hourlyRate = Number(formData.get("hourly_rate"));
  const depositPercent = Number(formData.get("deposit_percent"));
  const commissionPercent = Number(formData.get("commission_percent"));

  // Validate financially-critical values — never silently coerce a blank to 0.
  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
    throw new Error("Hourly rate must be a positive number.");
  }
  if (!Number.isFinite(depositPercent) || depositPercent < 0 || depositPercent > 100) {
    throw new Error("Deposit percent must be between 0 and 100.");
  }
  if (
    !Number.isFinite(commissionPercent) ||
    commissionPercent < 0 ||
    commissionPercent > 100
  ) {
    throw new Error("Commission percent must be between 0 and 100.");
  }

  const svc = serviceClient();
  await svc
    .from("settings")
    .update({
      hourly_rate: hourlyRate,
      deposit_percent: depositPercent,
      commission_percent: commissionPercent,
    })
    .eq("id", 1);
  revalidatePath("/admin/settings");
}
