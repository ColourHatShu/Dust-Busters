import { createClient } from "@supabase/supabase-js";
import { isEmailConfigured, sendEmail } from "./messaging";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Notification types worth mirroring to a transactional email — the money +
// match milestones a user shouldn't miss if they've left the app. Other in-app
// notifications stay in-app only.
const EMAILABLE_TYPES = new Set([
  "cleaner_found", // a cleaner accepted — pay your deposit
  "deposit_paid", // customer: deposit confirmed
  "deposit_received", // cleaner: deposit received
  "balance_received", // cleaner: balance received
  "job_completed", // customer: cleaning done — pay the balance
  "booking_expired", // customer: cancelled (deposit unpaid in time)
  "booking_released", // cleaner: accepted job released
]);

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

  // Best-effort transactional email mirror for key money/match events. When email
  // isn't configured this returns immediately (no user lookup, no network), so
  // it's a zero-cost no-op today and activates the moment RESEND_API_KEY /
  // RESEND_FROM are set. Wrapped so a messaging failure never breaks the caller
  // (webhook / server actions).
  if (isEmailConfigured() && EMAILABLE_TYPES.has(type)) {
    try {
      const { data } = await db.auth.admin.getUserById(userId);
      const email = data?.user?.email;
      if (email) {
        await sendEmail({ to: email, subject: title, text: body });
      }
    } catch (e) {
      console.error("[notifications] email mirror failed:", (e as Error).message);
    }
  }
}
