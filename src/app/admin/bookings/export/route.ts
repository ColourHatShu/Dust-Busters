import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bookingStatusLabel } from "@/lib/status";

const STATUSES = [
  "broadcasting",
  "accepted",
  "deposit_paid",
  "in_progress",
  "completed",
  "balance_paid",
  "closed",
  "cancelled",
  "no_cleaner_found",
  "disputed",
];

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const one = (v: unknown): { name?: string | null } | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v as { name?: string | null } | null);

// Admin bookings export: streams the bookings list as CSV, honouring the same
// q / status / from / to filters as the list page (so "export what you see").
export async function GET(req: Request) {
  const { user, profile } = await getSessionProfile();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select(
      `id, status, area, scheduled_at, hours, total_amount, created_at,
       customer:profiles!bookings_customer_id_fkey(name),
       cleaner:profiles!bookings_cleaner_id_fkey(name)`,
    )
    .order("created_at", { ascending: false });
  if (q) query = query.ilike("area", `%${q}%`);
  if (status && STATUSES.includes(status)) query = query.eq("status", status);
  if (isDate(from)) query = query.gte("scheduled_at", `${from}T00:00:00`);
  if (isDate(to)) query = query.lte("scheduled_at", `${to}T23:59:59.999`);
  const { data } = await query;
  const rows = data ?? [];

  const header = [
    "Booking ID",
    "Created",
    "Scheduled",
    "Status",
    "Area",
    "Customer",
    "Cleaner",
    "Hours",
    "Total (CAD)",
  ];
  const lines = [header.join(",")];
  for (const b of rows) {
    const customer = one(b.customer);
    const cleaner = one(b.cleaner);
    lines.push(
      [
        csvCell(b.id),
        csvCell(b.created_at ? new Date(b.created_at).toISOString().slice(0, 10) : ""),
        csvCell(b.scheduled_at ? new Date(b.scheduled_at).toISOString() : ""),
        csvCell(bookingStatusLabel(b.status)),
        csvCell(b.area),
        csvCell(customer?.name ?? ""),
        csvCell(cleaner?.name ?? ""),
        csvCell(b.hours),
        csvCell(b.total_amount != null ? Number(b.total_amount).toFixed(2) : ""),
      ].join(","),
    );
  }

  const csv = "﻿" + lines.join("\r\n") + "\r\n";
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dust-busters-bookings-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
