"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Live-refreshes the cleaner job list when new offers ring in or change, AND
// when one of the cleaner's assigned bookings changes status (e.g. the customer
// pays the deposit → deposit_paid, or the booking is cancelled/reassigned).
// Watching only booking_offers missed those bookings-table transitions, so the
// list went stale until a manual reload.
export default function JobsLive({ cleanerId }: { cleanerId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("cleaner-jobs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_offers",
          filter: `cleaner_id=eq.${cleanerId}`,
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `cleaner_id=eq.${cleanerId}`,
        },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cleanerId, router]);
  return null;
}
