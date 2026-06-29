"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for debugging; real logging/Sentry can hook in here later.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center p-6">
      <div className="card card-lg w-full empty-state">
        <span className="icon-tile icon-tile-danger icon-tile-lg" aria-hidden="true">
          <AlertTriangle className="h-7 w-7" strokeWidth={1.5} />
        </span>
        <h1 className="empty-state-title text-lg">Something went wrong</h1>
        <p className="empty-state-text">
          An unexpected error occurred. You can try again, or head back home.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button onClick={() => reset()} className="btn-base btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-base btn-secondary">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
