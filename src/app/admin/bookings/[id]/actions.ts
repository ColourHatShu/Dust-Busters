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

export async function updateBookingStatus(formData: FormData) {
  await assertAdmin();
  const bookingId = formData.get("booking_id") as string;
  const newStatus = formData.get("new_status") as string;
  const svc = serviceClient();
  await svc.from("bookings").update({ status: newStatus }).eq("id", bookingId);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
}

export async function adminCancelBooking(formData: FormData) {
  await assertAdmin();
  const bookingId = formData.get("booking_id") as string;
  const reason = formData.get("reason") as string;
  const svc = serviceClient();
  await svc
    .from("bookings")
    .update({ status: "cancelled", cancelled_by: "admin", cancellation_reason: reason })
    .eq("id", bookingId);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
}

export async function reassignCleaner(formData: FormData) {
  await assertAdmin();
  const bookingId = formData.get("booking_id") as string;
  const newCleanerId = formData.get("cleaner_id") as string;
  const svc = serviceClient();
  await svc.from("bookings").update({ cleaner_id: newCleanerId }).eq("id", bookingId);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
}
