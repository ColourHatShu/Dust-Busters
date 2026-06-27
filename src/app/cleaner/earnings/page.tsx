import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  DollarSign,
  Briefcase,
  TrendingUp,
  Clock,
  AlertCircle,
  Info,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  balance_paid: "Paid",
  closed: "Closed",
};

const STATUS_PILL: Record<string, string> = {
  completed: "pill-warning",
  balance_paid: "pill-success",
  closed: "pill-neutral",
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`surface-card flex flex-col gap-3 overflow-hidden ${
        accent ? "border-teal-400/30" : ""
      }`}
    >
      {accent && (
        <span
          className="section-glow section-glow--teal absolute -right-10 -top-12 h-32 w-32 opacity-40"
          aria-hidden
        />
      )}
      <div className="relative flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </span>
        <span
          className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${
            accent
              ? "border-teal-400/30 bg-teal-400/10 text-teal-300"
              : "border-white/10 bg-white/5 text-slate-300"
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </span>
      </div>
      <div
        className={`relative text-3xl font-bold tracking-tight ${
          accent ? "text-gradient-on-dark" : "text-slate-50"
        }`}
      >
        {value}
      </div>
      {sub && <div className="relative text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default async function CleanerEarningsPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "cleaner") redirect("/cleaner/onboard");

  const supabase = await createClient();

  // Current commission rate (configurable in admin settings); used as a fallback
  // for any legacy booking without a stored split.
  const { data: settings } = await supabase
    .from("settings")
    .select("commission_percent")
    .eq("id", 1)
    .single();
  const commissionPct = Number(settings?.commission_percent ?? 15);
  const feeRate = commissionPct / 100;

  // Completed / paid / closed jobs for this cleaner
  const { data: jobs } = await supabase
    .from("bookings")
    .select(
      "id, status, scheduled_at, hours, area, total_amount, balance_amount, platform_fee, cleaner_payout"
    )
    .eq("cleaner_id", user.id)
    .in("status", ["completed", "balance_paid", "closed"])
    .order("scheduled_at", { ascending: false });

  const allJobs = jobs ?? [];

  // Per-job take-home: the stored cleaner_payout (locked at booking time), with a
  // fallback compute for legacy rows.
  const payoutOf = (j: { cleaner_payout: number | null; total_amount: number }) =>
    j.cleaner_payout != null
      ? Number(j.cleaner_payout)
      : Number(j.total_amount) * (1 - feeRate);

  // Gross = sum of total_amount on paid/closed jobs (money actually received)
  const paidJobs = allJobs.filter((j) =>
    ["balance_paid", "closed"].includes(j.status)
  );
  const pendingJobs = allJobs.filter((j) => j.status === "completed");

  const grossEarned = paidJobs.reduce(
    (sum, j) => sum + Number(j.total_amount),
    0
  );
  const netEarnings = paidJobs.reduce((sum, j) => sum + payoutOf(j), 0);

  const pendingBalance = pendingJobs.reduce(
    (sum, j) => sum + Number(j.balance_amount ?? 0),
    0
  );

  return (
    <main className="app-shell min-h-screen py-10 sm:py-14">
      <span
        className="section-glow absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-3xl px-6">
        <header className="page-header">
          <span className="page-eyebrow">
            <DollarSign className="h-3.5 w-3.5" strokeWidth={2} />
            Cleaner · Payouts
          </span>
          <h1 className="page-title text-gradient-on-dark">Earnings</h1>
          <p className="page-subtitle">
            Your income summary and recent job history.
          </p>
        </header>

        {/* Summary stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            icon={Briefcase}
            label="Total jobs"
            value={String(paidJobs.length)}
            sub="completed & paid"
          />
          <StatCard
            icon={DollarSign}
            label="Gross earned"
            value={`$${grossEarned.toFixed(2)}`}
            sub="before platform fee"
          />
          <StatCard
            icon={TrendingUp}
            label="Net earnings"
            value={`$${netEarnings.toFixed(2)}`}
            sub={`after ${commissionPct.toFixed(0)}% platform fee`}
            accent
          />
          <StatCard
            icon={Clock}
            label="Pending balance"
            value={`$${pendingBalance.toFixed(2)}`}
            sub={`${pendingJobs.length} job${pendingJobs.length !== 1 ? "s" : ""} awaiting customer payment`}
          />
        </div>

        {/* Fee info */}
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] p-4 text-sm">
          <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-sky-400/25 bg-sky-400/10 text-sky-300">
            <Info className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <span className="text-slate-300">
            Dust Busters retains a{" "}
            <strong className="font-semibold text-slate-100">
              {commissionPct.toFixed(0)}% platform fee
            </strong>{" "}
            on each job; your take-home is shown above. Automated payouts
            aren&apos;t live yet — the team arranges your payment after each
            completed job, and direct deposit is coming soon.
          </span>
        </div>

        {/* Pending payouts section */}
        {pendingJobs.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-100">
              Pending Payouts
            </h2>
            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm">
              <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10 text-amber-300">
                <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
              </span>
              <span className="text-amber-100/80">
                These jobs are complete but the customer hasn&apos;t paid the
                balance yet. You&apos;ll receive payment once the customer
                settles their balance.
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {pendingJobs.map((j) => (
                <div
                  key={j.id}
                  className="surface-muted flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-medium text-slate-100">{j.area}</div>
                    <div className="mt-0.5 text-sm text-slate-400">
                      {new Date(j.scheduled_at).toLocaleDateString()} &middot;{" "}
                      {j.hours}h
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-slate-50">
                      ${Number(j.balance_amount ?? 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500">balance pending</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent jobs table */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-100">
            Recent Jobs
          </h2>
          {allJobs.length === 0 ? (
            <div className="surface-muted text-center text-sm text-slate-400">
              No completed jobs yet. Jobs will appear here once finished.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table-dark">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Area</th>
                    <th className="!text-right">Hours</th>
                    <th className="!text-right">Gross</th>
                    <th className="!text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allJobs.map((j) => {
                    const gross = Number(j.total_amount);
                    const net = payoutOf(j);
                    return (
                      <tr key={j.id}>
                        <td className="whitespace-nowrap text-slate-300">
                          {new Date(j.scheduled_at).toLocaleDateString()}
                        </td>
                        <td className="text-slate-300">{j.area}</td>
                        <td className="text-right text-slate-300">{j.hours}h</td>
                        <td className="text-right">
                          <div className="font-semibold text-slate-100">
                            ${gross.toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-500">
                            net ~${net.toFixed(2)}
                          </div>
                        </td>
                        <td className="text-right">
                          <span
                            className={`pill ${
                              STATUS_PILL[j.status] ?? "pill-neutral"
                            }`}
                          >
                            <span className="pill-dot" />
                            {STATUS_LABEL[j.status] ?? j.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
