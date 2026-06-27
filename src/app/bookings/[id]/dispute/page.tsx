import { redirect, notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { openDispute } from "./actions";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Flag, Info, ShieldCheck } from "lucide-react";

const DISPUTE_CATEGORIES = [
  { value: "no_show", label: "Cleaner did not show up" },
  { value: "poor_quality", label: "Poor cleaning quality" },
  { value: "property_damage", label: "Property damage" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "other", label: "Other" },
];

const DISPUTE_ALLOWED_STATUSES = ["deposit_paid", "in_progress", "completed"];

export default async function DisputePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, customer_id")
    .eq("id", id)
    .single();

  if (!booking || booking.customer_id !== user.id) notFound();
  if (!DISPUTE_ALLOWED_STATUSES.includes(booking.status)) {
    redirect(`/bookings/${id}`);
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;
    await openDispute(id, category, description);
  }

  return (
    <main className="app-shell relative min-h-screen overflow-hidden py-12 sm:py-16">
      {/* Ambient glows */}
      <span
        aria-hidden="true"
        className="section-glow section-glow--sky absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2"
      />
      <span
        aria-hidden="true"
        className="section-glow absolute -bottom-24 right-1/4 h-64 w-64"
      />

      <div className="relative z-10 mx-auto w-full max-w-lg px-6">
        <Link
          href={`/bookings/${id}`}
          className="link-accent mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to booking
        </Link>

        <header className="page-header">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/20 to-rose-500/10 text-amber-300 shadow-[0_0_28px_-6px_rgba(245,158,11,0.45)]">
              <AlertTriangle className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <div>
              <span className="page-eyebrow">Dispute Center</span>
              <h1 className="page-title">Report an Issue</h1>
            </div>
          </div>
          <p className="page-subtitle">
            Tell us what went wrong. Our support team will review your report
            within 24 hours.
          </p>
        </header>

        <div className="surface-card">
          <form action={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="category" className="field-label">
                Issue category
              </label>
              <select
                id="category"
                name="category"
                required
                className="input-dark"
                defaultValue=""
              >
                <option value="" disabled>
                  Select a category...
                </option>
                {DISPUTE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="field-label">
                Describe the issue
              </label>
              <textarea
                id="description"
                name="description"
                required
                minLength={20}
                maxLength={2000}
                rows={5}
                placeholder="Please provide as much detail as possible, including any relevant photos or timestamps..."
                className="input-dark"
              />
              <p className="field-hint">Minimum 20 characters.</p>
            </div>

            <div className="flex gap-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.07] p-4">
              <Info
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-300"
                strokeWidth={1.75}
              />
              <p className="text-sm leading-relaxed text-amber-100/90">
                <strong className="font-semibold text-amber-100">Note:</strong>{" "}
                Submitting a dispute will pause any pending payments and flag this
                booking for review. Our support team will contact you within 24
                hours.
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/bookings/${id}`}
                className="btn-base btn-outline flex-1 text-center"
              >
                Cancel
              </Link>
              <button type="submit" className="btn-base btn-glow flex-1">
                <Flag className="h-4 w-4" strokeWidth={2} />
                Submit Dispute
              </button>
            </div>
          </form>
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-faint">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" strokeWidth={2} />
          Your report is confidential and protected by our resolution guarantee.
        </p>
      </div>
    </main>
  );
}
