import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  CalendarCheck,
  Wallet,
  ChevronRight,
  UserX,
} from "lucide-react";
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

  // Presentational summaries derived from the already-fetched data.
  const list = customers ?? [];
  const totalCustomers = list.length;
  const totalBookings = list.reduce(
    (sum, c) => sum + (statsMap[c.id]?.count ?? 0),
    0
  );
  const totalRevenue = list.reduce(
    (sum, c) => sum + (statsMap[c.id]?.total ?? 0),
    0
  );

  const summary = [
    {
      label: "Total customers",
      value: totalCustomers.toLocaleString(),
      icon: Users,
    },
    {
      label: "Total bookings",
      value: totalBookings.toLocaleString(),
      icon: CalendarCheck,
    },
    {
      label: "Lifetime revenue",
      value: `$${totalRevenue.toFixed(2)}`,
      icon: Wallet,
      accent: true,
    },
  ];

  return (
    <main className="app-shell relative min-h-screen overflow-hidden py-10 sm:py-14">
      <span
        className="section-glow absolute -top-24 left-1/4 h-72 w-72"
        aria-hidden="true"
      />
      <span
        className="section-glow section-glow--sky absolute -top-16 right-1/4 h-64 w-64"
        aria-hidden="true"
      />

      <div className="app-container relative">
        <Link
          href="/admin"
          className="link-accent mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          Admin
        </Link>

        <header className="page-header">
          <span className="page-eyebrow">
            <Users className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            Customer directory
          </span>
          <h1 className="page-title text-gradient-on-dark">Customers</h1>
          <p className="page-subtitle">
            Browse, search, and review everyone who books with Dust Busters —
            with booking activity and lifetime spend at a glance.
          </p>
        </header>

        {/* Summary tiles */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {summary.map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="surface-card flex items-center gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-300/20 bg-emerald-500/10 text-teal-300">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-faint text-xs font-medium uppercase tracking-wider">
                  {label}
                </p>
                <p
                  className={`mt-1 truncate text-2xl font-semibold tabular-nums ${
                    accent ? "text-gradient-on-dark" : "text-slate-100"
                  }`}
                >
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <AdminSearch
          placeholder="Search customers by name or phone"
          defaultValue={q}
        />

        <div className="table-wrap">
          <table className="table-dark">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Bookings</th>
                <th>Total Spent</th>
                <th>Joined</th>
                <th className="text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400">
                        <UserX
                          className="h-6 w-6"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </span>
                      <p className="font-medium text-slate-200">
                        No customers found
                      </p>
                      <p className="text-dim max-w-sm text-sm">
                        {q
                          ? `No customers match “${q}”. Try a different name or phone number.`
                          : "Customers will appear here once they sign up and book a clean."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((c) => {
                  const stats = statsMap[c.id] ?? { count: 0, total: 0 };
                  const initial =
                    (c.name ?? "").trim().charAt(0).toUpperCase() || "?";
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-emerald-500/25 to-sky-500/20 text-sm font-semibold text-teal-200"
                            aria-hidden="true"
                          >
                            {initial}
                          </span>
                          <span className="font-medium text-slate-100">
                            {c.name ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="text-dim tabular-nums">
                        {c.phone ?? "—"}
                      </td>
                      <td>
                        <span className="pill pill-neutral tabular-nums">
                          {stats.count}
                        </span>
                      </td>
                      <td
                        className={`font-semibold tabular-nums ${
                          stats.total > 0 ? "text-emerald-300" : "text-slate-400"
                        }`}
                      >
                        ${stats.total.toFixed(2)}
                      </td>
                      <td className="text-faint text-xs tabular-nums">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="link-accent inline-flex items-center gap-1 text-xs font-medium"
                        >
                          View
                          <ChevronRight
                            className="h-3.5 w-3.5"
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
