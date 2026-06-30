import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Quote a CSV cell only when needed (comma, quote, or newline).
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Cleaner earnings export: streams the cleaner's completed/paid/closed jobs as a
// CSV download for bookkeeping/taxes. Mirrors the earnings page's payout math and
// is scoped to the signed-in cleaner's own rows (RLS via the server client).
export async function GET() {
  const { user, profile } = await getSessionProfile();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile?.role !== "cleaner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("commission_percent")
    .eq("id", 1)
    .single();
  const feeRate = Number(settings?.commission_percent ?? 15) / 100;

  const { data: jobs } = await supabase
    .from("bookings")
    .select(
      "status, scheduled_at, hours, area, total_amount, platform_fee, cleaner_payout",
    )
    .eq("cleaner_id", user.id)
    .in("status", ["completed", "balance_paid", "closed"])
    .order("scheduled_at", { ascending: false });

  const rows = jobs ?? [];
  const header = [
    "Date",
    "Area",
    "Hours",
    "Gross (CAD)",
    "Platform fee (CAD)",
    "Net payout (CAD)",
    "Status",
  ];
  const lines = [header.join(",")];

  for (const j of rows) {
    const gross = Number(j.total_amount ?? 0);
    const net =
      j.cleaner_payout != null ? Number(j.cleaner_payout) : gross * (1 - feeRate);
    const fee = j.platform_fee != null ? Number(j.platform_fee) : gross - net;
    lines.push(
      [
        csvCell(j.scheduled_at ? new Date(j.scheduled_at).toISOString().slice(0, 10) : ""),
        csvCell(j.area),
        csvCell(j.hours),
        csvCell(gross.toFixed(2)),
        csvCell(fee.toFixed(2)),
        csvCell(net.toFixed(2)),
        csvCell(j.status),
      ].join(","),
    );
  }

  // BOM so Excel reads UTF-8 correctly; CRLF line endings for spreadsheet apps.
  const csv = "﻿" + lines.join("\r\n") + "\r\n";
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dust-busters-earnings-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
