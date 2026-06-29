import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { AREAS } from "@/lib/areas";
import { becomeCleaner } from "./actions";
import { Sparkles, MapPin, Wallet, ShieldCheck, CalendarClock } from "lucide-react";

export default async function CleanerOnboardPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  // Already a cleaner? Re-running onboarding would let a deactivated cleaner
  // self-reactivate. Admins shouldn't accidentally demote themselves to cleaner.
  if (profile?.role === "cleaner") redirect("/cleaner/jobs");
  if (profile?.role === "admin") redirect("/admin");

  const benefits = [
    { icon: Wallet, title: "Earn on your schedule", text: "Accept the jobs that fit your week — no quotas." },
    { icon: MapPin, title: "Local jobs near you", text: "Get matched to cleanings in the areas you choose." },
    { icon: ShieldCheck, title: "Verified & trusted", text: "ID verification builds customer confidence in you." },
    { icon: CalendarClock, title: "Flexible & simple", text: "See requests in real time and accept with one tap." },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
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

      <div className="grid gap-6 lg:grid-cols-3">
        <form action={becomeCleaner} className="card space-y-6 lg:col-span-2">
          <fieldset className="flex flex-col gap-2">
            <legend className="form-label mb-2">
              <MapPin className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
              Areas you serve
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
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

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card card-sm flex flex-col gap-4">
            <h2 className="section-title">Why join Dust Busters</h2>
            <ul className="flex flex-col gap-4">
              {benefits.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="icon-tile icon-tile-sm icon-tile-soft">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-800">{title}</p>
                    <p className="text-sm text-slate-600">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
