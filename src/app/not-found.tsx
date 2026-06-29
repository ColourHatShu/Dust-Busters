import Link from "next/link";
import { Home, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center p-6">
      <div className="card card-lg w-full empty-state">
        <span className="icon-tile icon-tile-soft icon-tile-lg" aria-hidden="true">
          <Compass className="h-7 w-7" strokeWidth={1.5} />
        </span>
        <p className="text-gradient text-5xl font-bold">404</p>
        <h1 className="empty-state-title text-lg">Page not found</h1>
        <p className="empty-state-text">
          We couldn&apos;t find that page. It may have moved or never existed.
        </p>
        <Link href="/" className="btn-base btn-primary">
          <Home className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          Back home
        </Link>
      </div>
    </main>
  );
}
