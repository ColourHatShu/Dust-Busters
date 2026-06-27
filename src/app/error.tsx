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
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-400/30 bg-red-500/10 text-red-300">
        <AlertTriangle className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-100">Something went wrong</h1>
        <p className="text-dim">
          An unexpected error occurred. You can try again, or head back home.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button onClick={() => reset()} className="btn-base btn-glow">
          Try again
        </button>
        <Link href="/" className="btn-base btn-outline">
          Go home
        </Link>
      </div>
    </main>
  );
}
