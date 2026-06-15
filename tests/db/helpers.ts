import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service-role client bypasses RLS — used to set up + tear down fixtures.
export const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Create a confirmed auth user and return a client authenticated as them.
export async function makeUser(
  email: string,
  role: "customer" | "cleaner" | "admin"
) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user!.id;
  await admin.from("profiles").update({ role }).eq("id", id);

  const userClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await userClient.auth.signInWithPassword({ email, password: "password123" });
  return { id, client: userClient };
}

export async function cleanup() {
  const { data } = await admin.auth.admin.listUsers();
  for (const u of data.users) {
    if (u.email?.endsWith("@rls-test.local")) {
      await admin.auth.admin.deleteUser(u.id);
    }
  }
}
