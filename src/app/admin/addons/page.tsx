import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, CheckCircle, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAddon, toggleAddon } from "./actions";

type Addon = {
  id: string;
  key: string;
  label: string;
  price: number;
  active: boolean;
  sort: number;
};

export default async function AdminAddonsPage({
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

  const { data: addons } = await supabase
    .from("service_addons")
    .select("id, key, label, price, active, sort")
    .order("sort", { ascending: true })
    .order("label", { ascending: true })
    .returns<Addon[]>();
  const rows = addons ?? [];

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
            <Plus className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="page-title">Add-ons</h1>
            <p className="page-subtitle">
              Manage the paid extras customers can add at booking.
            </p>
          </div>
        </div>
      </div>

      {created && (
        <div className="alert alert-success">
          <CheckCircle className="h-5 w-5" strokeWidth={1.5} />
          <span>Add-on created.</span>
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
        <form action={createAddon} className="card space-y-4 lg:col-span-1">
          <h2 className="section-title">New add-on</h2>
          <label className="flex flex-col gap-1.5">
            <span className="form-label">Label</span>
            <input
              name="label"
              required
              placeholder="Inside the fridge"
              className="input-modern"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="form-label">Key</span>
            <input
              name="key"
              required
              placeholder="inside_fridge"
              className="input-modern lowercase placeholder:normal-case"
            />
            <span className="form-hint">
              Stable id — lowercase letters, numbers, underscores.
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="form-label">Price ($)</span>
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="25"
              className="input-modern"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="form-label">
              Sort <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input
              name="sort"
              type="number"
              step="1"
              placeholder="0"
              className="input-modern"
            />
          </label>
          <button className="btn-base btn-primary w-full">Create add-on</button>
        </form>

        {/* Existing add-ons */}
        <div className="lg:col-span-2">
          {rows.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">
                  <Plus className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="empty-state-title">No add-ons yet</p>
                <p className="empty-state-text">
                  Create your first paid extra on the left.
                </p>
              </div>
            </div>
          ) : (
            <div className="card card-flush overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Add-on</th>
                    <th className="num">Price</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <span className="font-medium text-slate-900">
                          {a.label}
                        </span>
                        <span className="ml-1.5 font-mono text-xs text-slate-400">
                          {a.key}
                        </span>
                      </td>
                      <td className="num">${Number(a.price).toFixed(2)}</td>
                      <td>
                        {a.active ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-neutral">Off</span>
                        )}
                      </td>
                      <td>
                        <form action={toggleAddon.bind(null, a.id, !a.active)}>
                          <button className="btn-base btn-secondary px-2.5 py-1 text-xs">
                            {a.active ? "Deactivate" : "Activate"}
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
