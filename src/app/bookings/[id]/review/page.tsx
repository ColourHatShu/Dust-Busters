import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { submitReview } from "./actions";
import StarRating from "./StarRating";

export default async function ReviewPage({
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

  if (!booking || booking.customer_id !== user.id) redirect("/");
  // Reviews are only allowed once the job is done (mirrors REVIEW_ALLOWED on the
  // booking page). Re-gate here so a direct URL can't review an in-flight booking.
  if (!["completed", "balance_paid"].includes(booking.status)) {
    redirect(`/bookings/${id}`);
  }

  return (
    <main className="app-shell relative overflow-hidden py-16 sm:py-24">
      {/* Ambient glows */}
      <span
        className="section-glow absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2"
        aria-hidden="true"
      />
      <span
        className="section-glow section-glow--teal absolute top-48 -right-16 h-64 w-64"
        aria-hidden="true"
      />

      <div className="app-container relative z-10">
        <div className="mx-auto max-w-lg">
          <Link
            href={`/bookings/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Back to booking
          </Link>

          <header className="mt-8 flex flex-col items-center gap-4 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-300/25 bg-gradient-to-br from-emerald-500/20 to-sky-500/10 text-teal-300 shadow-[0_0_32px_-8px_rgba(16,185,129,0.6)]">
              <Sparkles className="h-7 w-7" strokeWidth={1.5} />
            </span>
            <span className="page-eyebrow">Share your experience</span>
            <h1 className="page-title text-gradient-on-dark">
              Rate your cleaning
            </h1>
            <p className="page-subtitle text-center">
              Your feedback helps cleaners improve and helps other customers
              choose.
            </p>
          </header>

          <form
            action={async (formData) => {
              "use server";
              await submitReview(booking.id, formData);
            }}
            className="surface-card mt-10 flex flex-col gap-7"
          >
            <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
              <span className="text-sm font-medium text-slate-200">
                How was it?
              </span>
              <StarRating />
            </div>

            <div className="flex flex-col">
              <label htmlFor="comment" className="field-label">
                Comment{" "}
                <span className="font-normal text-faint">(optional)</span>
              </label>
              <textarea
                id="comment"
                name="comment"
                rows={4}
                placeholder="Tell us how it went…"
                className="input-dark"
              />
              <p className="field-hint">
                Share what stood out — specifics help future customers choose
                with confidence.
              </p>
            </div>

            <button className="btn-base btn-glow w-full">Submit review</button>
          </form>
        </div>
      </div>
    </main>
  );
}
