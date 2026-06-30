import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AdminSearch from "../AdminSearch";

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

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

  const customerList = customers ?? [];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <Link
          href="/admin"
          className="link-subtle inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Admin
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="icon-tile" aria-hidden="true">
              <Users className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <h1 className="page-title">Customers</h1>
              <p className="page-subtitle">
                {customerList.length}{" "}
                {customerList.length === 1 ? "customer" : "customers"}
              </p>
            </div>
          </div>
          {customerList.length > 0 && (
            <a
              href={`/admin/customers/export${q ? `?q=${encodeURIComponent(q)}` : ""}`}
              className="btn-base btn-secondary text-sm"
              download
            >
              <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Export CSV
            </a>
          )}
        </div>
      </div>

      <AdminSearch placeholder="Search customers by name or phone" defaultValue={q} />

      <div className="card card-flush overflow-hidden">
        {customerList.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              <Users className="h-7 w-7" strokeWidth={1.5} />
            </span>
            <p className="empty-state-title">No customers found</p>
            <p className="empty-state-text">
              {q
                ? "Try a different name or phone number."
                : "Customers will appear here once they sign up."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th className="num">Bookings</th>
                  <th className="num">Total Spent</th>
                  <th>Joined</th>
                  <th className="num"></th>
                </tr>
              </thead>
              <tbody>
                {customerList.map((c) => {
                  const stats = statsMap[c.id] ?? { count: 0, total: 0 };
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="avatar h-9 w-9 text-xs" aria-hidden="true">
                            {getInitials(c.name)}
                          </span>
                          <span className="font-medium text-slate-900">
                            {c.name ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td>{c.phone ?? "—"}</td>
                      <td className="num">{stats.count}</td>
                      <td className="num">${stats.total.toFixed(2)}</td>
                      <td className="whitespace-nowrap text-slate-500">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="num">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="link-accent text-xs"
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
        )}
      </div>
    </main>
  );
}
