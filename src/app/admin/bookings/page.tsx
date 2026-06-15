import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminBookingsPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "admin") redirect("/");

  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, status, area, scheduled_at, hours, total_amount, deposit_amount, balance_amount, cleaner_id, created_at"
    )
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Bookings</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">ID</th>
            <th className="p-2">Status</th>
            <th className="p-2">Area</th>
            <th className="p-2">Scheduled</th>
            <th className="p-2">Hours</th>
            <th className="p-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {(bookings ?? []).map((b) => (
            <tr key={b.id} className="border-b">
              <td className="p-2">{String(b.id).slice(0, 8)}</td>
              <td className="p-2">{b.status}</td>
              <td className="p-2">{b.area || "—"}</td>
              <td className="p-2">
                {b.scheduled_at
                  ? new Date(b.scheduled_at).toLocaleString()
                  : "—"}
              </td>
              <td className="p-2">{b.hours}</td>
              <td className="p-2">
                {b.total_amount != null
                  ? `$${Number(b.total_amount).toFixed(2)}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
