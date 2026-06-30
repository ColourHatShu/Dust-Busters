import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bookingBadgeClass, bookingStatusLabel } from "@/lib/status";
import {
  DollarSign,
  Briefcase,
  TrendingUp,
  Clock,
  AlertCircle,
  Info,
  Wallet,
  Download,
  CalendarDays,
} from "lucide-react";

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
    <div className={`stat-card ${accent ? "stat-card-accent" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="stat-label">{label}</span>
        <span
          className={`icon-tile icon-tile-sm ${accent ? "" : "icon-tile-soft"}`}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
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

  // Recent (rolling) net earnings by job date, so a cleaner sees momentum, not
  // just an all-time total.
  const now = Date.now();
  const DAY = 86_400_000;
  const inLast = (iso: string, days: number) =>
    new Date(iso).getTime() >= now - days * DAY;
  const periodNet = (days: number) =>
    paidJobs
      .filter((j) => inLast(j.scheduled_at, days))
      .reduce((sum, j) => sum + payoutOf(j), 0);
  const periodCount = (days: number) =>
    paidJobs.filter((j) => inLast(j.scheduled_at, days)).length;
  const net7 = periodNet(7);
  const net30 = periodNet(30);
  const count7 = periodCount(7);
  const count30 = periodCount(30);

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Earnings</h1>
          <p className="page-subtitle">
            Your income summary and recent job history
          </p>
        </div>
        {allJobs.length > 0 && (
          <a
            href="/cleaner/earnings/export"
            className="btn-base btn-secondary text-sm"
            download
          >
            <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Export CSV
          </a>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Recent earnings (rolling, by job date) */}
      {paidJobs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={CalendarDays}
            label="Last 7 days (net)"
            value={`$${net7.toFixed(2)}`}
            sub={`${count7} job${count7 !== 1 ? "s" : ""}`}
          />
          <StatCard
            icon={CalendarDays}
            label="Last 30 days (net)"
            value={`$${net30.toFixed(2)}`}
            sub={`${count30} job${count30 !== 1 ? "s" : ""}`}
          />
        </div>
      )}

      {/* Fee info */}
      <div className="alert alert-info">
        <Info className="h-4 w-4" strokeWidth={1.5} />
        <span>
          Dust Busters retains a{" "}
          <strong>{commissionPct.toFixed(0)}% platform fee</strong> on each job;
          your take-home is shown above. Automated payouts aren&apos;t live yet —
          the team arranges your payment after each completed job, and direct
          deposit is coming soon.
        </span>
      </div>

      {/* Pending payouts section */}
      {pendingJobs.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title">Pending Payouts</h2>
          <div className="alert alert-warning">
            <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
            <span>
              These jobs are complete but the customer hasn&apos;t paid the
              balance yet. You&apos;ll receive payment once the customer settles
              their balance.
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendingJobs.map((j) => (
              <div
                key={j.id}
                className="card flex items-center justify-between gap-4"
              >
                <div>
                  <div className="font-medium text-slate-900">{j.area}</div>
                  <div className="text-sm text-slate-500">
                    {new Date(j.scheduled_at).toLocaleDateString()} &middot;{" "}
                    {j.hours}h
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums text-slate-900">
                    ${Number(j.balance_amount ?? 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400">balance pending</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent jobs table */}
      <section className="space-y-3">
        <h2 className="section-title">Recent Jobs</h2>
        {allJobs.length === 0 ? (
          <div className="card card-flush">
            <div className="empty-state">
              <span className="empty-state-icon">
                <Wallet className="h-6 w-6" strokeWidth={1.5} />
              </span>
              <p className="empty-state-title">No completed jobs yet</p>
              <p className="empty-state-text">
                Jobs will appear here once they&apos;re finished.
              </p>
            </div>
          </div>
        ) : (
          <div className="card card-flush overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Area</th>
                  <th className="num">Hours</th>
                  <th className="num">Gross</th>
                  <th className="num">Status</th>
                </tr>
              </thead>
              <tbody>
                {allJobs.map((j) => {
                  const gross = Number(j.total_amount);
                  const net = payoutOf(j);
                  return (
                    <tr key={j.id}>
                      <td>{new Date(j.scheduled_at).toLocaleDateString()}</td>
                      <td>{j.area}</td>
                      <td className="num">{j.hours}h</td>
                      <td className="num">
                        <div className="font-medium text-slate-900">
                          ${gross.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-400">
                          net ~${net.toFixed(2)}
                        </div>
                      </td>
                      <td className="num">
                        <span className={bookingBadgeClass(j.status)}>
                          {bookingStatusLabel(j.status)}
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
    </main>
  );
}
