import { createClient } from "@supabase/supabase-js";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  bookingId?: string
): Promise<void> {
  const db = serviceClient();
  await db.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    booking_id: bookingId ?? null,
  });
}
