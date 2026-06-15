import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Booking = {
  id: string;
  status: string;
  area: string;
  scheduled_at: string;
  hours: number;
  total_amount: number;
};

export default async function BookingsPage() {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, status, area, scheduled_at, hours, total_amount")
    .order("created_at", { ascending: false });

  const bookings = (data ?? []) as Booking[];

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-bold">My bookings</h1>

      {bookings.length === 0 ? (
        <div className="rounded border p-6 text-center text-gray-600">
          <p className="mb-4">You don&apos;t have any bookings yet.</p>
          <Link
            href="/book"
            className="rounded bg-blue-600 px-6 py-3 font-medium text-white"
          >
            Book a cleaning
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((b) => (
            <li key={b.id} className="rounded border">
              <Link
                href={`/bookings/${b.id}`}
                className="flex flex-wrap items-center justify-between gap-2 p-4"
              >
                <div>
                  <div className="font-medium">{b.area}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(b.scheduled_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium capitalize">
                    {b.status}
                  </span>
                  <span className="font-medium">
                    ${b.total_amount}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
