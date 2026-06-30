import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type OwedRow = {
  cleaner_id: string;
  cleaner_payout: number | null;
  cleaner: { name?: string | null } | { name?: string | null }[] | null;
};

// Admin payouts export: outstanding cleaner payouts (settled jobs not yet paid
// out), summed per cleaner — so the founder can process manual payments from a
// spreadsheet. Mirrors the other admin CSV exports.
export async function GET() {
  const { user, profile } = await getSessionProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: owed } = await supabase
    .from("bookings")
    .select(
      "cleaner_id, cleaner_payout, cleaner:profiles!bookings_cleaner_id_fkey(name)",
    )
    .in("status", ["balance_paid", "closed"])
    .is("payout_paid_at", null)
    .not("cleaner_id", "is", null)
    .returns<OwedRow[]>();

  const byCleaner = new Map<string, { name: string; jobs: number; owed: number }>();
  for (const r of owed ?? []) {
    if (!r.cleaner_id) continue;
    const c = Array.isArray(r.cleaner) ? r.cleaner[0] : r.cleaner;
    const e = byCleaner.get(r.cleaner_id) ?? {
      name: c?.name ?? "Cleaner",
      jobs: 0,
      owed: 0,
    };
    e.jobs += 1;
    e.owed += Number(r.cleaner_payout ?? 0);
    byCleaner.set(r.cleaner_id, e);
  }
  const rows = Array.from(byCleaner.values()).sort((a, b) => b.owed - a.owed);

  const header = ["Cleaner", "Jobs owed", "Amount owed (CAD)"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [csvCell(r.name), csvCell(r.jobs), csvCell(r.owed.toFixed(2))].join(","),
    );
  }

  const csv = "﻿" + lines.join("\r\n") + "\r\n";
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dust-busters-payouts-owed-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
