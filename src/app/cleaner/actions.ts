"use server";

import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Short, friendly date for notification copy (e.g. "Mon, Jun 30").
function shortDate(iso: string | null | undefined): string {
  return iso
    ? new Date(iso).toLocaleDateString("en-CA", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "your scheduled date";
}

// Send the cleaner back to their jobs list with a friendly banner message rather
// than crashing to the global error boundary. redirect() throws NEXT_REDIRECT, so
// these calls must never sit inside a try/catch that swallows errors.
const jobsError = (msg: string) =>
  redirect(`/cleaner/jobs?actionError=${encodeURIComponent(msg)}`);

export async function acceptJob(bookingId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_offer", {
    p_booking_id: bookingId,
  });
  if (error) {
    // Double-booking guard (0011) raises this when the cleaner already holds an
    // overlapping job — surface it as a friendly notice instead of a crash.
    if (error.message.includes("SCHEDULE_CONFLICT")) {
      redirect("/cleaner/jobs?notice=conflict");
    }
    // Any other failure (offer already taken/expired, etc.) shouldn't crash the
    // page — return to the jobs list, which reflects the real state.
    console.error("acceptJob failed:", error.message);
    jobsError("We couldn't accept that job — it may no longer be available.");
  }

  // Tell the customer a cleaner accepted so they pay the deposit — this is one of
  // the two transitions that require customer action and previously sent nothing.
  // (The cleaner is now the assigned cleaner, so they can read the booking row.)
  if (data === true) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("customer_id, scheduled_at")
      .eq("id", bookingId)
      .single();
    if (booking?.customer_id) {
      await createNotification(
        booking.customer_id,
        "cleaner_accepted",
        "A cleaner accepted your booking",
        `Good news — a cleaner accepted your ${shortDate(booking.scheduled_at)} cleaning. Pay your deposit to lock it in.`,
        bookingId,
      );
    }
    // Won the race — confirm it so the cleaner knows the job is theirs.
    redirect("/cleaner/jobs?notice=won");
  }

  // accept_offer returned false: another cleaner accepted first (or the offer
  // expired). Previously this result was discarded and the loser got no feedback.
  redirect("/cleaner/jobs?notice=lost");
}

export async function setAvailability(accepting: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase
    .from("cleaner_details")
    .update({ accepting_jobs: accepting })
    .eq("profile_id", user.id);
  if (error) {
    console.error("setAvailability failed:", error.message);
    jobsError("We couldn't update your availability just now. Please try again.");
  }
  revalidatePath("/cleaner/jobs");
}

export async function declineJob(bookingId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_offer", {
    p_booking_id: bookingId,
  });
  if (error) {
    console.error("declineJob failed:", error.message);
    jobsError("We couldn't decline that job just now. Please try again.");
  }
  revalidatePath("/cleaner/jobs");
}

export async function startJob(bookingId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_job", { p_booking_id: bookingId });
  if (error) {
    console.error("startJob failed:", error.message);
    jobsError("We couldn't start that job — it may have already moved on.");
  }
  revalidatePath("/cleaner/jobs");
}

export async function completeJob(bookingId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_job", {
    p_booking_id: bookingId,
  });
  if (error) {
    console.error("completeJob failed:", error.message);
    jobsError("We couldn't complete that job — it may have already moved on.");
  }

  // Notify the customer their cleaning is done so they pay the balance — the
  // other payment-triggering transition that previously sent no notification.
  const { data: booking } = await supabase
    .from("bookings")
    .select("customer_id, scheduled_at")
    .eq("id", bookingId)
    .single();
  if (booking?.customer_id) {
    await createNotification(
      booking.customer_id,
      "job_completed",
      "Your cleaning is complete",
      `Your ${shortDate(booking.scheduled_at)} cleaning is complete. Please pay the remaining balance.`,
      bookingId,
    );
  }

  revalidatePath("/cleaner/jobs");
}
