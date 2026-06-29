import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { AREAS } from "@/lib/areas";
import { becomeCleaner } from "./actions";
import { Sparkles, MapPin } from "lucide-react";

export default async function CleanerOnboardPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  // Already a cleaner? Re-running onboarding would let a deactivated cleaner
  // self-reactivate. Admins shouldn't accidentally demote themselves to cleaner.
  if (profile?.role === "cleaner") redirect("/cleaner/jobs");
  if (profile?.role === "admin") redirect("/admin");

  return (
    <main className="mx-auto max-w-lg p-6">
      <div className="mb-6">
        <span className="page-eyebrow">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          Join the team
        </span>
        <h1 className="page-title mt-3">Become a cleaner</h1>
        <p className="page-subtitle">
          Choose the areas you can work in. An admin will verify your ID before
          you start receiving job requests.
        </p>
      </div>

      <form action={becomeCleaner} className="card space-y-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="form-label mb-2">
            <MapPin className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
            Areas you serve
          </legend>
          <div className="flex flex-col gap-2">
            {AREAS.map((a) => (
              <label key={a} className="checkbox-card">
                <input type="checkbox" name="areas" value={a} />
                <span>{a}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="w-full btn-base btn-primary">
          Join as a cleaner
        </button>
      </form>
    </main>
  );
}
