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
  // Won the race. The accept_offer RPC (migration 0024) already notifies the
  // customer ("Cleaner found — pay your deposit"), so we do NOT notify again here
  // (that would double-notify). Just confirm the win to the cleaner.
  if (data === true) {
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

// Today's date in Pacific wall-time as YYYY-MM-DD (en-CA renders ISO order).
function todayPacific(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Block a date the cleaner is unavailable (vacation, appointments). The
// dispatcher (request_booking, 0033) then won't ring them for that service date.
export async function addTimeOff(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const date = String(formData.get("off_date") || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayPacific()) {
    jobsError("Pick a valid date that isn't in the past.");
  }

  // Idempotent: re-adding the same date is a no-op (unique cleaner_id+off_date).
  const { error } = await supabase
    .from("cleaner_time_off")
    .upsert(
      { cleaner_id: user.id, off_date: date },
      { onConflict: "cleaner_id,off_date", ignoreDuplicates: true },
    );
  if (error) {
    console.error("addTimeOff failed:", error.message);
    jobsError("We couldn't save that date off just now. Please try again.");
  }
  revalidatePath("/cleaner/jobs");
}

export async function removeTimeOff(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS already restricts deletes to the owner; the explicit filter is belt-and-suspenders.
  const { error } = await supabase
    .from("cleaner_time_off")
    .delete()
    .eq("id", id)
    .eq("cleaner_id", user.id);
  if (error) {
    console.error("removeTimeOff failed:", error.message);
    jobsError("We couldn't remove that date off just now. Please try again.");
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
