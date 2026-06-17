import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { notificationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { notificationId } = body;
  if (!notificationId) {
    return NextResponse.json(
      { error: "notificationId is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("[mark-read] update error:", error);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
