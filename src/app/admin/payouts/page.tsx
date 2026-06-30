import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet, CheckCircle, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { markCleanerPaid } from "./actions";

type OwedRow = {
  cleaner_id: string;
  cleaner_payout: number | null;
  cleaner: { name: string | null } | { name: string | null }[] | null;
};

export default async function AdminPayoutsPage() {
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

  // Outstanding payouts: settled bookings (customer fully paid) not yet paid out.
  const { data: owed } = await supabase
    .from("bookings")
    .select(
      "cleaner_id, cleaner_payout, cleaner:profiles!bookings_cleaner_id_fkey(name)",
    )
    .in("status", ["balance_paid", "closed"])
    .is("payout_paid_at", null)
    .not("cleaner_id", "is", null)
    .returns<OwedRow[]>();

  const byCleaner = new Map<
    string,
    { name: string; jobs: number; owed: number }
  >();
  for (const r of owed ?? []) {
    if (!r.cleaner_id) continue;
    const c = Array.isArray(r.cleaner) ? r.cleaner[0] : r.cleaner;
    const entry = byCleaner.get(r.cleaner_id) ?? {
      name: c?.name ?? "Cleaner",
      jobs: 0,
      owed: 0,
    };
    entry.jobs += 1;
    entry.owed += Number(r.cleaner_payout ?? 0);
    byCleaner.set(r.cleaner_id, entry);
  }
  const rows = Array.from(byCleaner.entries())
    .map(([cleanerId, v]) => ({ cleanerId, ...v }))
    .sort((a, b) => b.owed - a.owed);
  const totalOwed = rows.reduce((s, r) => s + r.owed, 0);
  const money = (n: number) => n.toFixed(2);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <Link
          href="/admin"
          className="link-subtle mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Admin
        </Link>
        <div className="flex items-center gap-3">
          <span className="icon-tile">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="page-title">Payouts owed</h1>
            <p className="page-subtitle">
              Cleaner take-home from settled jobs not yet paid out.
            </p>
          </div>
        </div>
      </div>

      <div className="alert alert-info">
        <Wallet className="h-5 w-5" strokeWidth={1.5} />
        <span>
          Payouts are arranged off-system. &ldquo;Mark paid&rdquo; only records
          that you&apos;ve sent a cleaner their outstanding take-home — it
          doesn&apos;t move any money.
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">
              <CheckCircle className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="empty-state-title">All caught up</p>
            <p className="empty-state-text">
              No outstanding payouts — every settled job has been paid out.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">
              {rows.length} cleaner{rows.length === 1 ? "" : "s"} owed
            </h2>
            <div className="flex items-center gap-3">
              <span className="amount-lg">${money(totalOwed)}</span>
              <a
                href="/admin/payouts/export"
                className="btn-base btn-secondary text-sm"
                download
              >
                <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Export CSV
              </a>
            </div>
          </div>
          <div className="card card-flush overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cleaner</th>
                  <th className="num">Jobs</th>
                  <th className="num">Owed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.cleanerId}>
                    <td>
                      <Link
                        href={`/admin/cleaners/${r.cleanerId}`}
                        className="link-accent font-medium"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="num">{r.jobs}</td>
                    <td className="num font-semibold text-emerald-700">
                      ${money(r.owed)}
                    </td>
                    <td className="num">
                      <form action={markCleanerPaid.bind(null, r.cleanerId)}>
                        <ConfirmSubmit
                          message={`Record that you've paid ${r.name} their outstanding $${money(
                            r.owed,
                          )} (${r.jobs} job${r.jobs === 1 ? "" : "s"})? This is bookkeeping only — it doesn't move money.`}
                          className="btn-base btn-secondary px-2.5 py-1 text-xs"
                          pendingText="Saving…"
                        >
                          Mark paid
                        </ConfirmSubmit>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
