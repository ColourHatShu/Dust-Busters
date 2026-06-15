import { describe, it, expect, afterAll } from "vitest";
import { makeUser, cleanup, admin } from "./helpers";

const AREA = "Courtenay";

async function makeCleaner(email: string) {
  const c = await makeUser(email, "cleaner");
  await admin.from("cleaner_details").insert({
    profile_id: c.id,
    areas_served: [AREA],
    id_verified: true,
    active: true,
  });
  return c;
}

describe("broadcast dispatch", () => {
  afterAll(cleanup);

  it("rings every verified cleaner in the area and one accept wins", async () => {
    const customer = await makeUser("cust@rls-test.local", "customer");
    const c1 = await makeCleaner("c1@rls-test.local");
    const c2 = await makeCleaner("c2@rls-test.local");

    // Customer requests a 3-hour booking.
    const { data: bookingId, error } = await customer.client.rpc("request_booking", {
      p_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      p_hours: 3,
      p_area: AREA,
      p_full_address: "123 Cliffe Ave, Courtenay",
    });
    expect(error).toBeNull();
    expect(bookingId).toBeTruthy();

    // Pricing: 20 * 3 = 60; deposit 60% = 36; balance 24.
    const { data: booking } = await admin
      .from("bookings")
      .select("status, total_amount, deposit_amount, balance_amount")
      .eq("id", bookingId)
      .single();
    expect(booking!.status).toBe("broadcasting");
    expect(Number(booking!.total_amount)).toBe(60);
    expect(Number(booking!.deposit_amount)).toBe(36);
    expect(Number(booking!.balance_amount)).toBe(24);

    // Two offers were created (one per cleaner).
    const { data: offers } = await admin
      .from("booking_offers")
      .select("id")
      .eq("booking_id", bookingId);
    expect(offers).toHaveLength(2);

    // Both cleaners accept simultaneously — exactly one wins.
    const [r1, r2] = await Promise.all([
      c1.client.rpc("accept_offer", { p_booking_id: bookingId }),
      c2.client.rpc("accept_offer", { p_booking_id: bookingId }),
    ]);
    const wins = [r1.data, r2.data].filter((x) => x === true);
    expect(wins).toHaveLength(1);

    const { data: after } = await admin
      .from("bookings")
      .select("status, cleaner_id")
      .eq("id", bookingId)
      .single();
    expect(after!.status).toBe("accepted");
    expect(after!.cleaner_id).toBeTruthy();
  });

  it("masks the address until deposit is paid, then reveals it to the cleaner", async () => {
    const customer = await makeUser("cust2@rls-test.local", "customer");
    const cleaner = await makeCleaner("c3@rls-test.local");

    const { data: bookingId } = await customer.client.rpc("request_booking", {
      p_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      p_hours: 2,
      p_area: AREA,
      p_full_address: "456 Secret Lane",
    });
    await cleaner.client.rpc("accept_offer", { p_booking_id: bookingId });

    // Status is 'accepted' (not yet deposit_paid): cleaner cannot see address.
    const masked = await cleaner.client
      .from("booking_addresses")
      .select("full_address")
      .eq("booking_id", bookingId);
    expect(masked.data).toHaveLength(0);

    // Customer can always see their own address.
    const ownerView = await customer.client
      .from("booking_addresses")
      .select("full_address")
      .eq("booking_id", bookingId);
    expect(ownerView.data).toHaveLength(1);

    // Simulate deposit paid (Plan 3 does this via Stripe webhook).
    await admin.from("bookings").update({ status: "deposit_paid" }).eq("id", bookingId);

    const revealed = await cleaner.client
      .from("booking_addresses")
      .select("full_address")
      .eq("booking_id", bookingId);
    expect(revealed.data).toHaveLength(1);
    expect(revealed.data![0].full_address).toBe("456 Secret Lane");
  });

  it("re-broadcasts when an accepted cleaner backs out", async () => {
    const customer = await makeUser("cust3@rls-test.local", "customer");
    const c1 = await makeCleaner("c4@rls-test.local");
    const c2 = await makeCleaner("c5@rls-test.local");

    const { data: bookingId } = await customer.client.rpc("request_booking", {
      p_scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      p_hours: 1,
      p_area: AREA,
      p_full_address: "789 Test Rd",
    });

    await c1.client.rpc("accept_offer", { p_booking_id: bookingId });
    // c1 backs out.
    await c1.client.rpc("decline_offer", { p_booking_id: bookingId });

    const { data: reopened } = await admin
      .from("bookings")
      .select("status, cleaner_id")
      .eq("id", bookingId)
      .single();
    expect(reopened!.status).toBe("broadcasting");
    expect(reopened!.cleaner_id).toBeNull();

    // c2 can now accept the re-broadcast booking.
    const r = await c2.client.rpc("accept_offer", { p_booking_id: bookingId });
    expect(r.data).toBe(true);
  });
});
