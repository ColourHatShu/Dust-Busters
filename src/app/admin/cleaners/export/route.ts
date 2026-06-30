import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type Details = {
  id_verified: boolean | null;
  active: boolean | null;
  areas_served: string[] | null;
};
const one = (v: Details | Details[] | null | undefined): Details | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

// Admin cleaners (roster) export: name, phone, verified, active, areas served.
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
    .select("id, name, phone, cleaner_details(id_verified, active, areas_served)")
    .eq("role", "cleaner")
    .order("name", { ascending: true });
  if (q) cq = cq.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data: cleaners } = await cq;

  const header = ["Name", "Phone", "Verified", "Active", "Areas served"];
  const lines = [header.join(",")];
  for (const c of cleaners ?? []) {
    const d = one(c.cleaner_details as Details | Details[] | null);
    lines.push(
      [
        csvCell(c.name),
        csvCell(c.phone),
        csvCell(d?.id_verified ? "yes" : "no"),
        csvCell(d?.active ? "yes" : "no"),
        csvCell((d?.areas_served ?? []).join("; ")),
      ].join(","),
    );
  }

  const csv = "﻿" + lines.join("\r\n") + "\r\n";
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dust-busters-cleaners-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
