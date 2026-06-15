import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { submitReview } from "./actions";

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
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 text-2xl font-bold">Rate your cleaning</h1>
      <form
        action={async (formData) => {
          "use server";
          await submitReview(booking.id, formData);
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="rating" className="mb-1 block text-sm font-medium">
            Rating
          </label>
          <select
            id="rating"
            name="rating"
            defaultValue="5"
            className="w-full rounded border p-2"
          >
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Good</option>
            <option value="3">3 - Okay</option>
            <option value="2">2 - Poor</option>
            <option value="1">1 - Terrible</option>
          </select>
        </div>

        <div>
          <label htmlFor="comment" className="mb-1 block text-sm font-medium">
            Comment
          </label>
          <textarea
            id="comment"
            name="comment"
            rows={4}
            placeholder="Tell us how it went..."
            className="w-full rounded border p-2"
          />
        </div>

        <button className="w-full rounded bg-blue-600 p-3 font-medium text-white">
          Submit review
        </button>
      </form>
    </main>
  );
}
