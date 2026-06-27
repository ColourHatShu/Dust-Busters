"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

// Live "expires in m:ss" for an open offer. Renders nothing until mounted to
// avoid an SSR/client hydration mismatch on the ticking value.
export default function Countdown({ expiresAt }: { expiresAt: string | null }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setLeft(new Date(expiresAt).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt || left === null) return null;

  if (left <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
        <Timer className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
        Expired
      </span>
    );
  }

  const totalSec = Math.floor(left / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const urgent = left < 60_000;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        urgent ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
      }`}
    >
      <Timer className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
      Expires in {m}:{String(s).padStart(2, "0")}
    </span>
  );
}
