import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Admin customers export: name, phone, joined date, booking count, total spent.
// Honours the same `q` (name/phone) filter as the list page; RLS via admin client.
export async function GET(req: Request) {
  const { user, profile } = await getSessionProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;

  const supabase = await createClient();
  let cq = supabase
    .from("profiles")
    .select("id, name, phone, created_at")
    .eq("role", "customer")
    .order("created_at", { ascending: false });
  if (q) cq = cq.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data: customers } = await cq;

  const { data: bookingStats } = await supabase
    .from("bookings")
    .select("customer_id, total_amount, status");
  const stats: Record<string, { count: number; total: number }> = {};
  for (const b of bookingStats ?? []) {
    if (!b.customer_id) continue;
    if (!stats[b.customer_id]) stats[b.customer_id] = { count: 0, total: 0 };
    stats[b.customer_id].count += 1;
    if (b.status === "completed" || b.status === "balance_paid" || b.status === "closed") {
      stats[b.customer_id].total += Number(b.total_amount ?? 0);
    }
  }

  const header = ["Name", "Phone", "Joined", "Bookings", "Total spent (CAD)"];
  const lines = [header.join(",")];
  for (const c of customers ?? []) {
    const s = stats[c.id] ?? { count: 0, total: 0 };
    lines.push(
      [
        csvCell(c.name),
        csvCell(c.phone),
        csvCell(c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : ""),
        csvCell(s.count),
        csvCell(s.total.toFixed(2)),
      ].join(","),
    );
  }

  const csv = "﻿" + lines.join("\r\n") + "\r\n";
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dust-busters-customers-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
