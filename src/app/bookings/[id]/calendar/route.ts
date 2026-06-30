import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Escape a text value per RFC 5545 (\, ; , and newlines).
function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Format a Date as a UTC ICS timestamp: 20260715T140000Z.
function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

// Download an .ics for a booking's appointment — reduces no-shows by putting the
// clean in the customer's (and cleaner's) calendar. Served to either party; the
// RLS-aware client only returns the booking to a participant, and address
// visibility follows the booking_addresses RLS (cleaner sees it deposit_paid+).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, scheduled_at, hours, area, customer_id, cleaner_id")
    .eq("id", id)
    .maybeSingle();

  if (
    !booking ||
    (booking.customer_id !== user.id && booking.cleaner_id !== user.id)
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Address only if RLS lets this user read it (customer always; cleaner once
  // the deposit is paid). Falls back to the area.
  const { data: addr } = await supabase
    .from("booking_addresses")
    .select("full_address")
    .eq("booking_id", id)
    .maybeSingle();
  const location = addr?.full_address || booking.area;

  const start = new Date(booking.scheduled_at);
  const end = new Date(start.getTime() + Number(booking.hours) * 3_600_000);
  const base =
    process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  const url = `${base}/bookings/${id}`;

  const ics =
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Dust Busters//Booking//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${id}@dustbusters`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsEscape("Dust Busters home cleaning")}`,
      `LOCATION:${icsEscape(location)}`,
      `DESCRIPTION:${icsEscape(
        `Your ${booking.hours}h home cleaning. Manage this booking: ${url}`,
      )}`,
      `URL:${url}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n") + "\r\n";

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="dust-busters-${id.slice(0, 8)}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
