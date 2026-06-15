import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { acceptJob, declineJob, startJob, completeJob } from "../actions";
import JobsLive from "./JobsLive";

export default async function CleanerJobsPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "cleaner") redirect("/cleaner/onboard");

  const supabase = await createClient();

  // Open offers ringing right now.
  const { data: offers } = await supabase
    .from("booking_offers")
    .select(
      "booking_id, state, bookings(id, status, scheduled_at, hours, area, total_amount, deposit_amount)"
    )
    .eq("cleaner_id", user.id)
    .eq("state", "rung");

  const openOffers = (offers ?? []).filter((o) => {
    const b = Array.isArray(o.bookings) ? o.bookings[0] : o.bookings;
    return b?.status === "broadcasting";
  });

  // Jobs this cleaner has won.
  const { data: myJobs } = await supabase
    .from("bookings")
    .select("id, status, scheduled_at, hours, area, total_amount, deposit_amount")
    .eq("cleaner_id", user.id)
    .in("status", ["accepted", "deposit_paid", "in_progress", "completed"]);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <JobsLive cleanerId={user.id} />
      <h1 className="mb-4 text-2xl font-bold">Job requests</h1>

      {openOffers.length === 0 && (
        <p className="mb-8 text-sm text-gray-500">
          No open requests right now. New jobs will appear here instantly.
        </p>
      )}

      <div className="mb-10 flex flex-col gap-3">
        {openOffers.map((o) => {
          const b = Array.isArray(o.bookings) ? o.bookings[0] : o.bookings;
          if (!b) return null;
          return (
            <div key={o.booking_id} className="rounded border p-4 text-sm">
              <div className="font-semibold">
                {b.area} - {b.hours} hours
              </div>
              <div className="text-gray-600">
                {new Date(b.scheduled_at).toLocaleString()}
              </div>
              <div className="mt-1">
                You earn around ${Number(b.total_amount).toFixed(2)}
              </div>
              <div className="mt-3 flex gap-2">
                <form
                  action={async () => {
                    "use server";
                    await acceptJob(b.id);
                  }}
                >
                  <button className="rounded bg-green-600 px-4 py-1 text-white">
                    Accept
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await declineJob(b.id);
                  }}
                >
                  <button className="rounded border px-4 py-1">Decline</button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mb-4 text-xl font-bold">My jobs</h2>
      <div className="flex flex-col gap-3">
        {(myJobs ?? []).map((b) => (
          <div key={b.id} className="rounded border p-4 text-sm">
            <div className="font-semibold">
              {b.area} - {b.hours} hours
            </div>
            <div className="text-gray-600">
              {new Date(b.scheduled_at).toLocaleString()} - {b.status}
            </div>
            {b.status === "deposit_paid" && (
              <form
                action={async () => {
                  "use server";
                  await startJob(b.id);
                }}
              >
                <button className="mt-2 rounded bg-blue-600 px-4 py-1 text-white">
                  Start job
                </button>
              </form>
            )}
            {b.status === "in_progress" && (
              <form
                action={async () => {
                  "use server";
                  await completeJob(b.id);
                }}
              >
                <button className="mt-2 rounded bg-blue-600 px-4 py-1 text-white">
                  Mark complete
                </button>
              </form>
            )}
          </div>
        ))}
        {(myJobs ?? []).length === 0 && (
          <p className="text-sm text-gray-500">No jobs yet.</p>
        )}
      </div>
    </main>
  );
}
