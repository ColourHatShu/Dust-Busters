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
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-accent" strokeWidth={1.5} />
        <span className="text-sm font-medium text-slate-900">How many hours?</span>
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
          className="input-modern w-24 text-center"
        />
        <span className="text-slate-600">hours</span>
      </div>
      <p className="text-sm text-slate-500">
        Estimated total:{" "}
        <span className="font-semibold text-slate-800">
          {currency} ${total.toFixed(2)}
        </span>{" "}
        for {safeHours || 0} hr{safeHours === 1 ? "" : "s"}
        <br />
        Deposit due today:{" "}
        <span className="font-semibold text-slate-800">
          {currency} ${deposit}
        </span>{" "}
        ({depositPercent}%)
      </p>
    </label>
  );
}
