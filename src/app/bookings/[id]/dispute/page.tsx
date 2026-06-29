import { redirect, notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { openDispute } from "./actions";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Tag, FileText, Clock, Wallet, ShieldCheck } from "lucide-react";

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

  const whatHappens = [
    { icon: Wallet, text: "Any pending payments on this booking are paused." },
    { icon: Clock, text: "Our support team reviews your report within 24 hours." },
    { icon: ShieldCheck, text: "We contact you with next steps toward a fair resolution." },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <Link
          href={`/bookings/${id}`}
          className="link-subtle mb-4 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to booking
        </Link>
        <div className="flex items-center gap-4">
          <span className="icon-tile icon-tile-lg icon-tile-danger">
            <AlertTriangle className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="page-title">Report an Issue</h1>
            <p className="page-subtitle">Our team will review your report within 24 hours.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-6 lg:col-span-2">
          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="category" className="form-label">
                <Tag className="h-4 w-4" strokeWidth={1.5} />
                Issue category
              </label>
              <select
                id="category"
                name="category"
                required
                className="input-modern"
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

            <div className="space-y-2">
              <label htmlFor="description" className="form-label">
                <FileText className="h-4 w-4" strokeWidth={1.5} />
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
                className="input-modern resize-none"
              />
              <p className="form-hint">Minimum 20 characters.</p>
            </div>

            <div className="alert alert-warning">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
              <span>
                <strong>Note:</strong> Submitting a dispute will pause any pending payments and flag this booking for review. Our support team will contact you within 24 hours.
              </span>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/bookings/${id}`}
                className="btn-base btn-secondary flex-1 text-center"
              >
                Cancel
              </Link>
              <button type="submit" className="btn-base btn-primary flex-1">
                Submit Dispute
              </button>
            </div>
          </form>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card card-sm flex flex-col gap-4">
            <h2 className="section-title">What happens next</h2>
            <ul className="flex flex-col gap-3.5">
              {whatHappens.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="icon-tile icon-tile-sm icon-tile-soft">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="pt-1.5">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
