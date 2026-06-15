import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { AREAS } from "@/lib/areas";
import { becomeCleaner } from "./actions";

export default async function CleanerOnboardPage() {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-2 text-2xl font-bold">Become a cleaner</h1>
      <p className="mb-6 text-sm text-gray-600">
        Choose the areas you can work in. An admin will verify your ID before you
        start receiving job requests.
      </p>
      <form action={becomeCleaner} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Areas you serve</legend>
          {AREAS.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="areas" value={a} />
              {a}
            </label>
          ))}
        </fieldset>
        <button className="rounded bg-blue-600 p-3 font-medium text-white">
          Join as a cleaner
        </button>
      </form>
    </main>
  );
}
