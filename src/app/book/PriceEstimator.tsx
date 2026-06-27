"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

export default function PriceEstimator({
  rate,
  depositPercent,
  currency,
  defaultHours = 3,
}: {
  rate: number;
  depositPercent: number;
  currency: string;
  defaultHours?: number;
}) {
  const [hours, setHours] = useState(defaultHours);

  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 0;
  const total = rate * safeHours;
  const deposit = Math.round((total * depositPercent) / 100);

  return (
    <label className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10 text-teal-300">
          <Clock className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="text-sm font-medium text-slate-200">How many hours?</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          name="hours"
          min={1}
          max={12}
          step={1}
          value={Number.isNaN(hours) ? "" : hours}
          onChange={(e) => setHours(Number(e.target.value))}
          required
          className="input-dark w-24 text-center"
        />
        <span className="text-slate-400">hours</span>
      </div>

      <div className="surface-muted flex flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-dim">
            Estimated total
            <span className="text-faint">
              {" "}
              · {safeHours || 0} hr{safeHours === 1 ? "" : "s"}
            </span>
          </span>
          <span className="text-sm font-semibold text-slate-100">
            {currency} ${total.toFixed(2)}
          </span>
        </div>
        <hr className="divider" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-dim">
            Deposit due today
            <span className="text-faint"> · {depositPercent}%</span>
          </span>
          <span className="text-sm font-semibold text-teal-300">
            {currency} ${deposit}
          </span>
        </div>
      </div>
    </label>
  );
}
