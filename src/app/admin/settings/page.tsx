import { redirect } from "next/navigation";
import {
  SlidersHorizontal,
  Banknote,
  Wallet,
  Percent,
  Info,
  Save,
} from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateSettings } from "./actions";

export default async function AdminSettingsPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "admin") redirect("/");

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("hourly_rate, deposit_percent, commission_percent")
    .eq("id", 1)
    .single();

  const fmt = (v: number | null | undefined, suffix = "") =>
    v === null || v === undefined ? "—" : `${v}${suffix}`;

  return (
    <main className="app-shell">
      <span
        className="section-glow absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2"
        aria-hidden="true"
      />
      <span
        className="section-glow section-glow--sky absolute right-0 top-40 h-64 w-64"
        aria-hidden="true"
      />

      <div className="app-container relative z-10 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <header className="page-header">
            <span className="page-eyebrow">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Platform configuration
            </span>
            <h1 className="page-title text-gradient-on-dark">Settings</h1>
            <p className="page-subtitle">
              Tune the economics behind every new booking — base pricing, the
              upfront deposit, and the platform commission. Changes apply to new
              bookings going forward.
            </p>
          </header>

          {/* Current configuration at a glance */}
          <section
            aria-label="Current configuration"
            className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <div className="surface-muted">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-faint">
                <Banknote className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                Hourly rate
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-100">
                {fmt(settings?.hourly_rate)}
              </div>
            </div>
            <div className="surface-muted">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-faint">
                <Wallet className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
                Deposit
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-100">
                {fmt(settings?.deposit_percent, "%")}
              </div>
            </div>
            <div className="surface-muted">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-faint">
                <Percent className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
                Commission
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-100">
                {fmt(settings?.commission_percent, "%")}
              </div>
            </div>
          </section>

          <form action={updateSettings} className="surface-card space-y-7">
            <div>
              <label
                htmlFor="hourly_rate"
                className="field-label flex items-center gap-2"
              >
                <Banknote className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                Hourly Rate
              </label>
              <div className="relative">
                <input
                  id="hourly_rate"
                  name="hourly_rate"
                  type="number"
                  step="0.01"
                  defaultValue={settings?.hourly_rate ?? ""}
                  className="input-dark"
                  style={{ paddingRight: "3.5rem" }}
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-medium text-faint">
                  / hr
                </span>
              </div>
              <p className="field-hint">
                Base rate used to price new jobs across the marketplace.
              </p>
            </div>

            <hr className="divider" />

            <div>
              <label
                htmlFor="deposit_percent"
                className="field-label flex items-center gap-2"
              >
                <Wallet className="h-4 w-4 text-teal-300" aria-hidden="true" />
                Deposit Percent
              </label>
              <div className="relative">
                <input
                  id="deposit_percent"
                  name="deposit_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  defaultValue={settings?.deposit_percent ?? ""}
                  className="input-dark"
                  style={{ paddingRight: "3rem" }}
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-medium text-faint">
                  %
                </span>
              </div>
              <p className="field-hint">
                Charged upfront when a booking is confirmed (0–100).
              </p>
            </div>

            <div>
              <label
                htmlFor="commission_percent"
                className="field-label flex items-center gap-2"
              >
                <Percent className="h-4 w-4 text-sky-300" aria-hidden="true" />
                Platform commission %
              </label>
              <div className="relative">
                <input
                  id="commission_percent"
                  name="commission_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  defaultValue={settings?.commission_percent ?? ""}
                  className="input-dark"
                  style={{ paddingRight: "3rem" }}
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-medium text-faint">
                  %
                </span>
              </div>
              <p className="field-hint flex items-start gap-1.5">
                <Info
                  className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <span>
                  Applied to new bookings going forward (existing bookings keep
                  their locked rate).
                </span>
              </p>
            </div>

            <hr className="divider-glow" />

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-faint">
                Updates take effect immediately for new bookings.
              </p>
              <button type="submit" className="btn-base btn-glow">
                <Save className="h-4 w-4" aria-hidden="true" />
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
