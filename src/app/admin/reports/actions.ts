"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

// Resolve a flagged message: 'reviewed' (acted on / acknowledged) or 'dismissed'.
export async function resolveReport(formData: FormData) {
  await assertAdmin();
  const id = formData.get("report_id") as string;
  const status = formData.get("status") as string;
  if (!["reviewed", "dismissed"].includes(status)) {
    throw new Error("Invalid status");
  }
  const svc = serviceClient();
  await svc.from("message_reports").update({ status }).eq("id", id);
  revalidatePath("/admin/reports");
}
