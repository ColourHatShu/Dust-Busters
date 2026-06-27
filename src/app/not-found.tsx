import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="text-gradient-on-dark text-6xl font-bold">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-100">Page not found</h1>
        <p className="text-dim">
          We couldn&apos;t find that page. It may have moved or never existed.
        </p>
      </div>
      <Link href="/" className="btn-base btn-glow">
        <Home className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        Back home
      </Link>
    </main>
  );
}
