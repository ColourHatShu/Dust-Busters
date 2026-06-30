"use client";

import { useActionState } from "react";
import PriceEstimator from "./PriceEstimator";
import { submitBooking, type BookingFormState } from "./actions";
import { CLEANING_TASK_GROUPS } from "@/lib/checklist";
import { RECURRENCE_OPTIONS } from "@/lib/recurring";
import {
  Calendar,
  MapPin,
  Home,
  Lock,
  AlertTriangle,
  Heart,
  ClipboardList,
  Sparkles,
  Repeat,
  Tag,
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
  prefillCleaner,
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
  prefillCleaner?: string;
  savedAddresses: { id: string; label: string | null; full_address: string }[];
  favorites: Fav[];
}) {
  const [state, action, pending] = useActionState<BookingFormState, FormData>(
    submitBooking,
    undefined,
  );

  return (
    <form action={action} className="card flex flex-col gap-6">
      {state?.error && (
        <div className="alert alert-error" role="alert">
          <AlertTriangle className="h-5 w-5" strokeWidth={2} />
          <span>{state.error}</span>
        </div>
      )}

      <label className="flex flex-col gap-2.5">
        <span className="form-label">
          <Calendar className="h-4 w-4 text-accent" strokeWidth={1.75} />
          Date and time
        </span>
        <input
          type="datetime-local"
          name="scheduled_at"
          required
          min={minDate}
          className="input-modern cursor-pointer"
          onClick={(e) => {
            // Open the native picker when the whole field is clicked, not just
            // the calendar icon. (No-op if the browser disallows/lacks it.)
            try {
              e.currentTarget.showPicker();
            } catch {}
          }}
        />
      </label>

      <label className="flex flex-col gap-2.5">
        <span className="form-label">
          <Repeat className="h-4 w-4 text-accent" strokeWidth={1.75} />
          Repeat
        </span>
        <select name="repeat" className="input-modern" defaultValue="0">
          {RECURRENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="form-hint">
          Set up a recurring clean — each visit is booked for you automatically
          and paid separately.
        </span>
      </label>

      <PriceEstimator
        rate={rate}
        depositPercent={depositPercent}
        currency={currency}
        defaultHours={prefillHours}
      />

      <hr className="hr-soft" />

      <label className="flex flex-col gap-2.5">
        <span className="form-label">
          <MapPin className="h-4 w-4 text-accent" strokeWidth={1.75} />
          Area
        </span>
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
        <label className="flex flex-col gap-2.5">
          <span className="form-label">
            <Heart className="h-4 w-4 text-accent" strokeWidth={1.75} />
            Cleaner
          </span>
          <select
            name="preferred_cleaner"
            className="input-modern"
            defaultValue={prefillCleaner ?? ""}
          >
            <option value="">Any available cleaner</option>
            {favorites.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} (favorite)
              </option>
            ))}
          </select>
          <span className="form-hint">
            Request a favorite directly, or let any available cleaner accept.
          </span>
        </label>
      )}

      <label className="flex flex-col gap-2.5">
        <span className="form-label">
          <Home className="h-4 w-4 text-accent" strokeWidth={1.75} />
          Full address
        </span>
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
        <span className="form-hint flex items-start gap-1.5">
          <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent" strokeWidth={1.75} />
          <span>
            Your address stays hidden from cleaners until you&apos;ve paid the
            deposit.
          </span>
        </span>
      </label>

      <hr className="hr-soft" />

      <fieldset className="flex flex-col gap-3">
        <legend className="form-label mb-1">
          <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span>
            What should we focus on?{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </span>
        </legend>
        {CLEANING_TASK_GROUPS.map((g) => (
          <div key={g.group} className="flex flex-col gap-2">
            <span className="eyebrow-label">{g.group}</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {g.tasks.map((t) => (
                <label key={t.key} className="checkbox-card">
                  <input type="checkbox" name="checklist" value={t.key} />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <span className="form-hint">
          Pick the areas and extras that matter most — your cleaner sees this
          after you pay the deposit.
        </span>
      </fieldset>

      <hr className="hr-soft" />

      <label className="flex flex-col gap-2.5">
        <span className="form-label">
          <ClipboardList className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span>
            Special instructions{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </span>
        </span>
        <textarea
          name="notes"
          rows={3}
          maxLength={1000}
          placeholder="e.g. focus on the kitchen and bathrooms, pets inside, parking out front…"
          className="input-modern"
        />
        <span className="form-hint">
          Shared with your cleaner after you pay the deposit.
        </span>
      </label>

      <label className="flex flex-col gap-2.5">
        <span className="form-label">
          <Tag className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span>
            Promo code{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </span>
        </span>
        <input
          type="text"
          name="promo_code"
          placeholder="e.g. WELCOME15"
          autoCapitalize="characters"
          className="input-modern uppercase placeholder:normal-case"
        />
        <span className="form-hint">
          First-clean &amp; referral discounts. Applied to your total — one-time
          bookings only.
        </span>
      </label>

      <button className="btn-base btn-primary mt-6" disabled={pending}>
        {pending ? "Finding a cleaner…" : "Find a cleaner"}
      </button>
    </form>
  );
}
