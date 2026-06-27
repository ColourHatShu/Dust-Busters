"use client";

import { useState } from "react";
import { Star } from "lucide-react";

const LABELS = ["", "Terrible", "Poor", "Okay", "Good", "Excellent"];

export default function StarRating({
  name = "rating",
  defaultValue = 5,
}: {
  name?: string;
  defaultValue?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex flex-col items-center gap-2">
      <input type="hidden" name={name} value={value} />
      <div
        className="flex gap-1.5"
        role="radiogroup"
        aria-label="Star rating"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setValue(n)}
            onMouseEnter={() => setHover(n)}
            className="rounded transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
          >
            <Star
              className={`h-10 w-10 ${
                n <= shown
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-slate-300"
              }`}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
      <span className="text-sm font-medium text-slate-600">{LABELS[shown]}</span>
    </div>
  );
}
