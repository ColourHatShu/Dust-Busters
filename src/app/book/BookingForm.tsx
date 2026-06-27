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
  Loader2,
  Search,
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
    <form action={action} className="surface-card flex flex-col gap-7 sm:p-8">
      {state?.error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-200">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-300"
            strokeWidth={2}
          />
          <span>{state.error}</span>
        </div>
      )}

      <label className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10 text-teal-300">
            <Calendar className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="text-sm font-medium text-slate-200">Date and time</span>
        </div>
        <input
          type="datetime-local"
          name="scheduled_at"
          required
          min={minDate}
          className="input-dark cursor-pointer"
          onClick={(e) => {
            // Open the native picker when the whole field is clicked, not just
            // the calendar icon. (No-op if the browser disallows/lacks it.)
            try {
              e.currentTarget.showPicker();
            } catch {}
          }}
        />
      </label>

      <PriceEstimator
        rate={rate}
        depositPercent={depositPercent}
        currency={currency}
        defaultHours={prefillHours}
      />

      <label className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10 text-teal-300">
            <MapPin className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="text-sm font-medium text-slate-200">Area</span>
        </div>
        <select
          name="area"
          required
          className="input-dark"
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
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10 text-teal-300">
              <Heart className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="text-sm font-medium text-slate-200">Cleaner</span>
          </div>
          <select name="preferred_cleaner" className="input-dark" defaultValue="">
            <option value="">Any available cleaner</option>
            {favorites.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} (favorite)
              </option>
            ))}
          </select>
          <span className="field-hint">
            Request a favorite directly, or let any available cleaner accept.
          </span>
        </label>
      )}

      <label className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10 text-teal-300">
            <Home className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="text-sm font-medium text-slate-200">Full address</span>
        </div>
        <input
          type="text"
          name="full_address"
          required
          placeholder="Street, unit, city"
          className="input-dark"
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
        <div className="flex items-start gap-2 text-xs text-faint">
          <Lock
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-300"
            strokeWidth={1.5}
          />
          <span>
            Your address stays hidden from cleaners until you&apos;ve paid the
            deposit.
          </span>
        </div>
      </label>

      <label className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10 text-teal-300">
            <ClipboardList className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="text-sm font-medium text-slate-200">
            Special instructions{" "}
            <span className="font-normal text-slate-500">(optional)</span>
          </span>
        </div>
        <textarea
          name="notes"
          rows={3}
          maxLength={1000}
          placeholder="e.g. focus on the kitchen and bathrooms, pets inside, parking out front…"
          className="input-dark"
        />
        <span className="field-hint">
          Shared with your cleaner after you pay the deposit.
        </span>
      </label>

      <button className="btn-base btn-glow mt-2 w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            Finding a cleaner…
          </>
        ) : (
          <>
            <Search className="h-4 w-4" strokeWidth={2} />
            Find a cleaner
          </>
        )}
      </button>
    </form>
  );
}
