import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <Link
        href={`/bookings/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        Back to booking
      </Link>

      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Rate your cleaning</h1>
        <p className="text-slate-600">
          Your feedback helps cleaners improve and helps other customers choose.
        </p>
      </div>

      <form
        action={async (formData) => {
          "use server";
          await submitReview(booking.id, formData);
        }}
        className="card flex flex-col gap-6"
      >
        <div className="flex flex-col gap-3">
          <span className="text-center text-sm font-medium text-slate-900">
            How was it?
          </span>
          <StarRating />
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-900">
            Comment <span className="font-normal text-slate-400">(optional)</span>
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
    </main>
  );
}
