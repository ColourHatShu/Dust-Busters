"use client";

import { useState } from "react";
import { Clock, Plus } from "lucide-react";

type Addon = { key: string; label: string; price: number };

export default function PriceEstimator({
  rate,
  depositPercent,
  currency,
  defaultHours = 3,
  addons = [],
}: {
  rate: number;
  depositPercent: number;
  currency: string;
  defaultHours?: number;
  addons?: Addon[];
}) {
  const [hours, setHours] = useState(defaultHours);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 0;
  const addonsTotal = addons
    .filter((a) => selected.has(a.key))
    .reduce((sum, a) => sum + Number(a.price), 0);
  const total = rate * safeHours + addonsTotal;
  const deposit = Math.round((total * depositPercent) / 100);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="flex flex-col gap-2.5">
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
      </label>

      {addons.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="form-label mb-1">
            <Plus className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <span>
              Add-ons{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {addons.map((a) => (
              <label key={a.key} className="checkbox-card">
                <input
                  type="checkbox"
                  name="addons"
                  value={a.key}
                  checked={selected.has(a.key)}
                  onChange={() => toggle(a.key)}
                />
                <span className="flex-1">{a.label}</span>
                <span className="font-medium text-slate-500">
                  +${Number(a.price).toFixed(0)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="surface-muted mt-1 flex divide-x divide-slate-200">
        <div className="flex-1 px-4 py-3.5">
          <p className="stat-label">Estimated total</p>
          <p className="amount-lg mt-0.5">
            {currency} ${total.toFixed(2)}
          </p>
          <p className="stat-sub mt-0.5">
            {safeHours || 0} hr{safeHours === 1 ? "" : "s"}
            {addonsTotal > 0 ? ` + $${addonsTotal.toFixed(0)} add-ons` : ""}
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
    </div>
  );
}
