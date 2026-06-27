"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Radar, CheckCircle, Star, ShieldCheck, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cancelBooking } from "../cancel-actions";

export type MatchingData = {
  status: string;
  area: string;
  center: { lat: number; lng: number };
  notified: number;
  deciding: number;
  expires_at: string | null;
  pins: { k: string; lat: number; lng: number; state: string }[];
  winner: {
    name: string;
    verified: boolean;
    jobs: number;
    rating: number | null;
    scheduled_at: string;
  } | null;
};

const LeafletBasemap = dynamic(() => import("./LeafletBasemap"), {
  ssr: false,
  loading: () => <div className="matching-map matching-map-skeleton" />,
});

const ACTIVE = new Set(["broadcasting", "accepted"]);

export default function MatchingMap({
  bookingId,
  initial,
}: {
  bookingId: string;
  initial: MatchingData | null;
}) {
  const [data, setData] = useState<MatchingData | null>(initial);
  const statusRef = useRef<string | undefined>(initial?.status);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      const { data: d } = await supabase.rpc("get_booking_matching", {
        p_booking_id: bookingId,
      });
      if (!alive) return;
      if (d) {
        setData(d as MatchingData);
        statusRef.current = (d as MatchingData).status;
      }
      // Keep polling only while the match is live; refresh the page when the
      // booking advances past 'accepted' (deposit step) so this view unmounts.
      if (statusRef.current && ACTIVE.has(statusRef.current)) {
        timer = setTimeout(tick, 2500);
      }
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [bookingId]);

  if (!data) return <div className="matching-map matching-map-skeleton" />;

  const broadcasting = data.status === "broadcasting";
  const accepted = data.status === "accepted";
  const noCleaner = data.status === "no_cleaner_found";

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700 bg-[#0b1220] text-slate-100 shadow-elevation-lg">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        {broadcasting && (
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" strokeWidth={2} />
        )}
        {accepted && <CheckCircle className="h-5 w-5 text-emerald-400" strokeWidth={2} />}
        {noCleaner && <XCircle className="h-5 w-5 text-amber-400" strokeWidth={2} />}
        <div className="flex-1">
          <p className="font-semibold">
            {broadcasting && "Finding your cleaner…"}
            {accepted && "Cleaner found!"}
            {noCleaner && "No cleaner available right now"}
          </p>
          <p className="text-xs text-slate-400">
            {broadcasting &&
              `${data.notified} cleaner${data.notified === 1 ? "" : "s"} notified in ${data.area} · ${data.deciding} deciding`}
            {accepted && "Confirm your booking with the deposit below."}
            {noCleaner && "Nobody was free for this slot. Try a different time."}
          </p>
        </div>
        {broadcasting && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Radar className="h-3.5 w-3.5" strokeWidth={2} /> live
          </span>
        )}
      </div>

      {/* Map */}
      <div className="matching-wrap">
        <LeafletBasemap center={data.center} pins={data.pins} />
        {broadcasting && (
          <div className="matching-radar" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      {/* Cancel the search (broadcasting only) */}
      {broadcasting && (
        <div className="border-t border-slate-700 px-5 py-3 text-center">
          <form action={cancelBooking.bind(null, bookingId, "Cancelled the search")}>
            <button className="text-sm font-medium text-slate-400 transition hover:text-red-300">
              Cancel search
            </button>
          </form>
        </div>
      )}

      {/* Winner card */}
      {accepted && data.winner && (
        <div className="flex items-center gap-4 border-t border-slate-700 px-5 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white">
            {data.winner.name?.[0]?.toUpperCase() ?? "C"}
          </div>
          <div className="flex-1">
            <p className="flex items-center gap-1.5 font-semibold">
              {data.winner.name}
              {data.winner.verified && (
                <ShieldCheck className="h-4 w-4 text-emerald-400" strokeWidth={2} />
              )}
            </p>
            <p className="flex items-center gap-2 text-xs text-slate-400">
              {data.winner.rating != null && (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {data.winner.rating}
                </span>
              )}
              <span>
                {data.winner.jobs} job{data.winner.jobs === 1 ? "" : "s"} completed
              </span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
