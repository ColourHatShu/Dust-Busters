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

const PLATFORM_FEE_RATE = 0.15; // 15% platform cut

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  balance_paid: "Paid",
  closed: "Closed",
};

const STATUS_COLOR: Record<string, string> = {
  completed: "bg-orange-100 text-orange-700",
  balance_paid: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
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
    <div className={`card flex flex-col gap-2 ${accent ? "border-teal-200 bg-teal-50" : ""}`}>
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className={`h-4 w-4 ${accent ? "text-teal-600" : ""}`} strokeWidth={1.5} />
        <span className="text-sm">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${accent ? "text-teal-700" : "text-slate-900"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default async function CleanerEarningsPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "cleaner") redirect("/cleaner/onboard");

  const supabase = await createClient();

  // Completed / paid / closed jobs for this cleaner
  const { data: jobs } = await supabase
    .from("bookings")
    .select("id, status, scheduled_at, hours, area, total_amount, balance_amount")
    .eq("cleaner_id", user.id)
    .in("status", ["completed", "balance_paid", "closed"])
    .order("scheduled_at", { ascending: false });

  const allJobs = jobs ?? [];

  // Gross = sum of total_amount on paid/closed jobs (money actually received)
  const paidJobs = allJobs.filter((j) =>
    ["balance_paid", "closed"].includes(j.status)
  );
  const pendingJobs = allJobs.filter((j) => j.status === "completed");

  const grossEarned = paidJobs.reduce(
    (sum, j) => sum + Number(j.total_amount),
    0
  );
  const platformFee = grossEarned * PLATFORM_FEE_RATE;
  const netEarnings = grossEarned - platformFee;

  const pendingBalance = pendingJobs.reduce(
    (sum, j) => sum + Number(j.balance_amount ?? 0),
    0
  );

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your income summary and recent job history
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
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
          sub={`after ${(PLATFORM_FEE_RATE * 100).toFixed(0)}% platform fee`}
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
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
        <span>
          Dust Busters retains a{" "}
          <strong>{(PLATFORM_FEE_RATE * 100).toFixed(0)}% platform fee</strong>{" "}
          on each completed job. Payouts are processed weekly every{" "}
          <strong>Friday</strong> via direct deposit.
        </span>
      </div>

      {/* Pending payouts section */}
      {pendingJobs.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Pending Payouts
          </h2>
          <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            <AlertCircle
              className="mt-0.5 h-4 w-4 flex-shrink-0"
              strokeWidth={1.5}
            />
            <span>
              These jobs are complete but the customer hasn&apos;t paid the
              balance yet. You&apos;ll receive payment once the customer settles
              their balance.
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-3">
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
                  <div className="font-semibold text-slate-900">
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
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Recent Jobs
        </h2>
        {allJobs.length === 0 ? (
          <div className="card text-center text-sm text-slate-400">
            No completed jobs yet. Jobs will appear here once finished.
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Area
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">
                    Hours
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">
                    Gross
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allJobs.map((j) => {
                  const gross = Number(j.total_amount);
                  const net = gross * (1 - PLATFORM_FEE_RATE);
                  return (
                    <tr key={j.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">
                        {new Date(j.scheduled_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{j.area}</td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {j.hours}h
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-medium text-slate-900">
                          ${gross.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-400">
                          net ~${net.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_COLOR[j.status] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
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
    </main>
  );
}
