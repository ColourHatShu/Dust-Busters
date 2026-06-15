import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";

export default async function AdminHomePage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile?.role !== "admin") redirect("/");

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Admin</h1>
      <ul className="space-y-2">
        <li>
          <Link href="/admin/cleaners" className="text-blue-600 underline">
            Cleaners
          </Link>
        </li>
        <li>
          <Link href="/admin/bookings" className="text-blue-600 underline">
            Bookings
          </Link>
        </li>
        <li>
          <Link href="/admin/settings" className="text-blue-600 underline">
            Settings
          </Link>
        </li>
      </ul>
    </main>
  );
}
