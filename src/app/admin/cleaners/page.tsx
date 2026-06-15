import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setCleanerVerified } from "./actions";

export default async function AdminCleanersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/");

  const { data: cleaners } = await supabase
    .from("profiles")
    .select("id, name, phone, cleaner_details(id_verified, active, areas_served)")
    .eq("role", "cleaner");

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Cleaners</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Areas</th>
            <th className="p-2">Verified</th>
            <th className="p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {(cleaners ?? []).map((c) => {
            const d = Array.isArray(c.cleaner_details)
              ? c.cleaner_details[0]
              : c.cleaner_details;
            const verified = d?.id_verified ?? false;
            return (
              <tr key={c.id} className="border-b">
                <td className="p-2">{c.name || "(no name)"}</td>
                <td className="p-2">{(d?.areas_served ?? []).join(", ") || "—"}</td>
                <td className="p-2">{verified ? "✓" : "—"}</td>
                <td className="p-2">
                  <form
                    action={async () => {
                      "use server";
                      await setCleanerVerified(c.id, !verified);
                    }}
                  >
                    <button className="rounded bg-green-600 px-3 py-1 text-white">
                      {verified ? "Unverify" : "Verify"}
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
