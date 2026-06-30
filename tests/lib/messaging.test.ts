import { describe, it, expect, afterEach } from "vitest";
import { isEmailConfigured, isSmsConfigured } from "@/lib/messaging";

// Snapshot the relevant env once, mutate per-test, restore after each.
const KEYS = [
  "RESEND_API_KEY",
  "RESEND_FROM",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM",
];
const saved: Record<string, string | undefined> = {};
for (const k of KEYS) saved[k] = process.env[k];
function clearEnv() {
  for (const k of KEYS) delete process.env[k];
}
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("isEmailConfigured", () => {
  it("is false when keys are missing (safe no-op by default)", () => {
    clearEnv();
    expect(isEmailConfigured()).toBe(false);
  });
  it("requires BOTH the API key and a from address", () => {
    clearEnv();
    process.env.RESEND_API_KEY = "re_test";
    expect(isEmailConfigured()).toBe(false);
    process.env.RESEND_FROM = "Dust Busters <noreply@example.com>";
    expect(isEmailConfigured()).toBe(true);
  });
});

describe("isSmsConfigured", () => {
  it("is false until all three Twilio values are present", () => {
    clearEnv();
    expect(isSmsConfigured()).toBe(false);
    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "tok";
    expect(isSmsConfigured()).toBe(false);
    process.env.TWILIO_FROM = "+15555550123";
    expect(isSmsConfigured()).toBe(true);
  });
});
