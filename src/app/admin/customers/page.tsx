import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminSearch from "../AdminSearch";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/");

  let customersQuery = supabase
    .from("profiles")
    .select("id, name, phone, created_at")
    .eq("role", "customer")
    .order("created_at", { ascending: false });
  if (q) {
    customersQuery = customersQuery.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data: customers } = await customersQuery;

  // Get booking counts and total spend per customer
  const { data: bookingStats } = await supabase
    .from("bookings")
    .select("customer_id, total_amount, status");

  const statsMap: Record<string, { count: number; total: number }> = {};
  for (const b of bookingStats ?? []) {
    if (!statsMap[b.customer_id]) statsMap[b.customer_id] = { count: 0, total: 0 };
    statsMap[b.customer_id].count += 1;
    if (b.status === "completed") {
      statsMap[b.customer_id].total += Number(b.total_amount ?? 0);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
      </div>
      <AdminSearch placeholder="Search customers by name or phone" defaultValue={q} />
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Phone</th>
              <th className="p-3 font-medium">Bookings</th>
              <th className="p-3 font-medium">Total Spent</th>
              <th className="p-3 font-medium">Joined</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(customers ?? []).map((c) => {
              const stats = statsMap[c.id] ?? { count: 0, total: 0 };
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">{c.name ?? "—"}</td>
                  <td className="p-3 text-gray-600">{c.phone ?? "—"}</td>
                  <td className="p-3">{stats.count}</td>
                  <td className="p-3">${stats.total.toFixed(2)}</td>
                  <td className="p-3 text-gray-500 text-xs">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
