import { redirect, notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StatusLive from "./StatusLive";
import { payDeposit, payBalance } from "./payment-actions";

const STATUS_LABEL: Record<string, string> = {
  broadcasting: "Finding a cleaner near you...",
  accepted: "Cleaner found! Confirm with your deposit.",
  deposit_paid: "Deposit paid. Your cleaner is booked.",
  in_progress: "Your cleaning is in progress.",
  completed: "Cleaning complete. Please pay the balance.",
  balance_paid: "Paid in full. Thank you!",
  closed: "Closed.",
  cancelled: "Cancelled.",
  no_cleaner_found: "Sorry, no cleaner was available for this slot.",
};

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, scheduled_at, hours, area, total_amount, deposit_amount, balance_amount, cleaner_id"
    )
    .eq("id", id)
    .single();
  if (!booking) notFound();

  let cleaner: { name: string; id_verified: boolean; jobs_completed: number } | null =
    null;
  if (booking.cleaner_id) {
    const { data } = await supabase.rpc("get_cleaner_card", {
      p_cleaner: booking.cleaner_id,
    });
    cleaner = Array.isArray(data) ? data[0] : data;
  }

  const { data: address } = await supabase
    .from("booking_addresses")
    .select("full_address")
    .eq("booking_id", id)
    .maybeSingle();

  const showDeposit = booking.status === "accepted";
  const showBalance = booking.status === "completed";

  return (
    <main className="mx-auto max-w-lg p-6">
      <StatusLive bookingId={booking.id} />
      <h1 className="mb-2 text-2xl font-bold">Your booking</h1>
      <p className="mb-4 text-lg text-blue-700">{STATUS_LABEL[booking.status]}</p>

      <div className="mb-4 rounded border p-4 text-sm">
        <div className="flex justify-between">
          <span>When</span>
          <span>{new Date(booking.scheduled_at).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Hours</span>
          <span>{booking.hours}</span>
        </div>
        <div className="flex justify-between">
          <span>Area</span>
          <span>{booking.area}</span>
        </div>
        {address?.full_address && (
          <div className="flex justify-between">
            <span>Address</span>
            <span>{address.full_address}</span>
          </div>
        )}
      </div>

      {cleaner && (
        <div className="mb-4 flex items-center gap-3 rounded border p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-2xl">
            CB
          </div>
          <div className="text-sm">
            <div className="font-semibold">
              {cleaner.name || "Your cleaner"}{" "}
              {cleaner.id_verified && (
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                  ID-verified
                </span>
              )}
            </div>
            <div className="text-gray-500">
              {cleaner.jobs_completed} jobs completed
            </div>
          </div>
        </div>
      )}

      <div className="rounded border p-4 text-sm">
        <div className="flex justify-between">
          <span>Total</span>
          <span>${Number(booking.total_amount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-green-700">
          <span>Deposit (pay to confirm)</span>
          <span>${Number(booking.deposit_amount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Balance (after the job)</span>
          <span>${Number(booking.balance_amount).toFixed(2)}</span>
        </div>
      </div>

      {showDeposit && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-green-700">
            You pay the rest only after the cleaning is done to your satisfaction.
          </p>
          <form
            action={async () => {
              "use server";
              await payDeposit(booking.id);
            }}
          >
            <button className="w-full rounded bg-blue-600 p-3 font-medium text-white">
              Pay ${Number(booking.deposit_amount).toFixed(2)} deposit securely
            </button>
          </form>
        </div>
      )}

      {showBalance && (
        <div className="mt-4">
          <form
            action={async () => {
              "use server";
              await payBalance(booking.id);
            }}
          >
            <button className="w-full rounded bg-blue-600 p-3 font-medium text-white">
              Pay ${Number(booking.balance_amount).toFixed(2)} balance securely
            </button>
          </form>
        </div>
      )}

      {(showDeposit || showBalance) && (
        <p className="mt-3 text-center text-xs text-gray-500">
          Secured by Stripe. Free cancellation up to 2 hours before. Need help?
          support@dustbusters.ca
        </p>
      )}
    </main>
  );
}
