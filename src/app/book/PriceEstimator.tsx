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
    <label className="flex flex-col gap-2.5">
      <span className="form-label">
        <Clock className="h-4 w-4 text-accent" strokeWidth={1.75} />
        How many hours?
      </span>
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
          className="input-modern w-24 text-center"
        />
        <span className="text-slate-600">hours</span>
      </div>
      <div className="surface-muted mt-1 flex divide-x divide-slate-200">
        <div className="flex-1 px-4 py-3.5">
          <p className="stat-label">Estimated total</p>
          <p className="amount-lg mt-0.5">
            {currency} ${total.toFixed(2)}
          </p>
          <p className="stat-sub mt-0.5">
            for {safeHours || 0} hr{safeHours === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex-1 px-4 py-3.5">
          <p className="stat-label">Deposit due today</p>
          <p className="amount-lg mt-0.5 text-accent">
            {currency} ${deposit}
          </p>
          <p className="stat-sub mt-0.5">{depositPercent}%</p>
        </div>
      </div>
    </label>
  );
}
