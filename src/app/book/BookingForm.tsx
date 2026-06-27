"use client";

import { useActionState } from "react";
import PriceEstimator from "./PriceEstimator";
import { submitBooking, type BookingFormState } from "./actions";
import {
  Calendar,
  MapPin,
  Home,
  Lock,
  AlertTriangle,
  Heart,
  ClipboardList,
} from "lucide-react";

type Fav = { id: string; name: string };

export default function BookingForm({
  rate,
  currency,
  depositPercent,
  minDate,
  areas,
  prefillHours,
  prefillArea,
  savedAddresses,
  favorites,
}: {
  rate: number;
  currency: string;
  depositPercent: number;
  minDate: string;
  areas: readonly string[];
  prefillHours: number;
  prefillArea?: string;
  savedAddresses: { id: string; label: string | null; full_address: string }[];
  favorites: Fav[];
}) {
  const [state, action, pending] = useActionState<BookingFormState, FormData>(
    submitBooking,
    undefined,
  );

  return (
    <form action={action} className="card flex flex-col gap-8">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2} />
          <span>{state.error}</span>
        </div>
      )}

      <label className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent" strokeWidth={1.5} />
          <span className="text-sm font-medium text-slate-900">Date and time</span>
        </div>
        <input
          type="datetime-local"
          name="scheduled_at"
          required
          min={minDate}
          className="input-modern"
        />
      </label>

      <PriceEstimator
        rate={rate}
        depositPercent={depositPercent}
        currency={currency}
        defaultHours={prefillHours}
      />

      <label className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-accent" strokeWidth={1.5} />
          <span className="text-sm font-medium text-slate-900">Area</span>
        </div>
        <select
          name="area"
          required
          className="input-modern"
          defaultValue={prefillArea}
        >
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      {favorites.length > 0 && (
        <label className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-accent" strokeWidth={1.5} />
            <span className="text-sm font-medium text-slate-900">Cleaner</span>
          </div>
          <select name="preferred_cleaner" className="input-modern" defaultValue="">
            <option value="">Any available cleaner</option>
            {favorites.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} (favorite)
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            Request a favorite directly, or let any available cleaner accept.
          </span>
        </label>
      )}

      <label className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5 text-accent" strokeWidth={1.5} />
          <span className="text-sm font-medium text-slate-900">Full address</span>
        </div>
        <input
          type="text"
          name="full_address"
          required
          placeholder="Street, unit, city"
          className="input-modern"
          list="saved-addresses"
        />
        {savedAddresses.length > 0 && (
          <datalist id="saved-addresses">
            {savedAddresses.map((a) => (
              <option key={a.id} value={a.full_address}>
                {a.label ?? a.full_address}
              </option>
            ))}
          </datalist>
        )}
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" strokeWidth={1.5} />
          <span>
            Your address stays hidden from cleaners until you&apos;ve paid the
            deposit.
          </span>
        </div>
      </label>

      <label className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-accent" strokeWidth={1.5} />
          <span className="text-sm font-medium text-slate-900">
            Special instructions{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </span>
        </div>
        <textarea
          name="notes"
          rows={3}
          maxLength={1000}
          placeholder="e.g. focus on the kitchen and bathrooms, pets inside, parking out front…"
          className="input-modern"
        />
        <span className="text-xs text-slate-500">
          Shared with your cleaner after you pay the deposit.
        </span>
      </label>

      <button className="btn-base btn-primary mt-6" disabled={pending}>
        {pending ? "Finding a cleaner…" : "Find a cleaner"}
      </button>
    </form>
  );
}
