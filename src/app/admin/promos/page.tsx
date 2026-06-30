import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Tag,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createPromo, togglePromo } from "./actions";

type Promo = {
  id: string;
  code: string;
  kind: string;
  value: number;
  active: boolean;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  first_clean_only: boolean;
};

export default async function AdminPromosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { error, created } = await searchParams;
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

  const { data: promos } = await supabase
    .from("promo_codes")
    .select(
      "id, code, kind, value, active, max_uses, used_count, expires_at, first_clean_only",
    )
    .order("created_at", { ascending: false })
    .returns<Promo[]>();
  const rows = promos ?? [];

  const fmtValue = (p: Promo) =>
    p.kind === "percent" ? `${Number(p.value)}% off` : `$${Number(p.value)} off`;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
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
            <Tag className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="page-title">Promo codes</h1>
            <p className="page-subtitle">
              Create and manage referral / first-clean discount codes.
            </p>
          </div>
        </div>
      </div>

      {created && (
        <div className="alert alert-success">
          <CheckCircle className="h-5 w-5" strokeWidth={1.5} />
          <span>Promo code created.</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create form */}
        <form action={createPromo} className="card space-y-4 lg:col-span-1">
          <h2 className="section-title">New code</h2>
          <label className="flex flex-col gap-1.5">
            <span className="form-label">Code</span>
            <input
              name="code"
              required
              placeholder="WELCOME15"
              className="input-modern uppercase placeholder:normal-case"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="form-label">Discount type</span>
            <select name="kind" className="input-modern" defaultValue="percent">
              <option value="percent">Percent (%)</option>
              <option value="amount">Flat amount ($)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="form-label">Value</span>
            <input
              name="value"
              type="number"
              min="1"
              step="0.01"
              required
              placeholder="15"
              className="input-modern"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="form-label">
              Max uses{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input
              name="max_uses"
              type="number"
              min="1"
              step="1"
              placeholder="Unlimited"
              className="input-modern"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="form-label">
              Expires{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input name="expires_at" type="date" className="input-modern" />
          </label>
          <label className="checkbox-card">
            <input type="checkbox" name="first_clean_only" />
            <span>First booking only</span>
          </label>
          <button className="btn-base btn-primary w-full">Create code</button>
        </form>

        {/* Existing codes */}
        <div className="lg:col-span-2">
          {rows.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">
                  <Tag className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="empty-state-title">No promo codes yet</p>
                <p className="empty-state-text">
                  Create your first code on the left.
                </p>
              </div>
            </div>
          ) : (
            <div className="card card-flush overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Discount</th>
                    <th className="num">Used</th>
                    <th>Limits</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono font-medium text-slate-900">
                        {p.code}
                        {p.first_clean_only && (
                          <span className="ml-1.5 align-middle text-xs font-normal text-slate-400">
                            1st only
                          </span>
                        )}
                      </td>
                      <td>{fmtValue(p)}</td>
                      <td className="num">
                        {p.used_count}
                        {p.max_uses != null ? ` / ${p.max_uses}` : ""}
                      </td>
                      <td className="text-xs text-slate-500">
                        {p.expires_at
                          ? `exp ${new Date(p.expires_at).toLocaleDateString()}`
                          : "—"}
                      </td>
                      <td>
                        {p.active ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-neutral">Off</span>
                        )}
                      </td>
                      <td>
                        <form action={togglePromo.bind(null, p.id, !p.active)}>
                          <button className="btn-base btn-secondary px-2.5 py-1 text-xs">
                            {p.active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
