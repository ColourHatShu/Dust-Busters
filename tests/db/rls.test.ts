import { describe, it, expect, afterAll } from "vitest";
import { makeUser, cleanup, admin } from "./helpers";

describe("RLS policies", () => {
  afterAll(cleanup);

  it("a customer can read only their own profile", async () => {
    const a = await makeUser("a@rls-test.local", "customer");
    const b = await makeUser("b@rls-test.local", "customer");

    const own = await a.client.from("profiles").select("id").eq("id", a.id);
    expect(own.data).toHaveLength(1);

    const other = await a.client.from("profiles").select("id").eq("id", b.id);
    expect(other.data).toHaveLength(0); // hidden by RLS
  });

  it("an admin can read any profile", async () => {
    const adminUser = await makeUser("admin@rls-test.local", "admin");
    const c = await makeUser("c@rls-test.local", "customer");
    const res = await adminUser.client.from("profiles").select("id").eq("id", c.id);
    expect(res.data).toHaveLength(1);
  });

  it("a non-admin cannot update settings", async () => {
    const u = await makeUser("d@rls-test.local", "customer");
    await u.client.from("settings").update({ hourly_rate: 999 }).eq("id", 1);
    const check = await admin
      .from("settings")
      .select("hourly_rate")
      .eq("id", 1)
      .single();
    expect(Number(check.data!.hourly_rate)).toBe(20); // unchanged
  });
});
