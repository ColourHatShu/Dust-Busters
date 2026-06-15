"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Live-refreshes the cleaner job list when new offers ring in or change.
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
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cleanerId, router]);
  return null;
}
