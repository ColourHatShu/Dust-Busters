"use server";

import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { redirect } from "next/navigation";

// Quick day-of arrival updates a cleaner can send the customer (in-app
// notification). Reduces no-access/anxiety on the day. In-app only — the type
// isn't in EMAILABLE_TYPES, so no email even once a provider is configured.
const MESSAGES: Record<
  string,
  { title: string; body: (name: string) => string }
> = {
  on_my_way: {
    title: "Your cleaner is on the way",
    body: (n) => `${n} is heading to your place now.`,
  },
  late: {
    title: "Your cleaner is running late",
    body: (n) =>
      `${n} is running about 15 minutes behind — thanks for your patience.`,
  },
};

const ALLOWED = new Set(["deposit_paid", "in_progress"]);

export async function sendArrivalStatus(bookingId: string, kind: string) {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const msg = MESSAGES[kind];
  if (!msg) redirect(`/cleaner/jobs/${bookingId}`);

  const supabase = await createClient();
  // RLS lets the assigned cleaner read the booking; re-check ownership + status.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, cleaner_id, customer_id")
    .eq("id", bookingId)
    .single();
  if (
    !booking ||
    booking.cleaner_id !== user.id ||
    !ALLOWED.has(booking.status)
  ) {
    redirect(`/cleaner/jobs/${bookingId}`);
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();
  const name = me?.name || "Your cleaner";

  await createNotification(
    booking.customer_id,
    "cleaner_update",
    msg.title,
    msg.body(name),
    bookingId,
  );
  redirect(`/cleaner/jobs/${bookingId}?statusSent=1`);
}
