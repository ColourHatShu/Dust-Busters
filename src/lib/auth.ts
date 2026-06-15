import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

// Returns the current user and their profile (role, name), or nulls if signed out.
export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, name")
    .eq("id", user.id)
    .single();
  return { user, profile: profile as { id: string; role: Role; name: string } | null };
}
