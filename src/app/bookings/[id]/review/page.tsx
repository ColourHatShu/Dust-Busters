import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Star, MessageSquare, Lightbulb, Check } from "lucide-react";
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

  const tips = [
    "Mention what stood out — punctuality, attention to detail, friendliness.",
    "Be specific and honest; it helps cleaners improve.",
    "Keep it respectful — focus on the work, not the person.",
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <Link
        href={`/bookings/${id}`}
        className="link-subtle inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        Back to booking
      </Link>

      <div className="flex items-center gap-4">
        <span className="icon-tile icon-tile-lg">
          <Star className="h-6 w-6" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="page-title">Rate your cleaning</h1>
          <p className="page-subtitle">
            Your feedback helps cleaners improve and helps other customers choose.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <form
          action={async (formData) => {
            "use server";
            await submitReview(booking.id, formData);
          }}
          className="card flex flex-col gap-6 lg:col-span-2"
        >
          <div className="surface-muted flex flex-col items-center gap-4 p-5 text-center">
            <span className="eyebrow-label">How was it?</span>
            <StarRating />
          </div>

          <label className="flex flex-col gap-2">
            <span className="form-label">
              <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
              Comment
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <textarea
              name="comment"
              rows={4}
              placeholder="Tell us how it went…"
              className="input-modern"
            />
          </label>

          <button className="btn-base btn-primary">Submit review</button>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card card-sm flex flex-col gap-3">
            <span className="icon-tile icon-tile-sm icon-tile-soft">
              <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <h2 className="section-title">Tips for a helpful review</h2>
            <ul className="flex flex-col gap-2.5">
              {tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" strokeWidth={2} />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
