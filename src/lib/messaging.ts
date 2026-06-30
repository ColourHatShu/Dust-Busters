// Provider-agnostic transactional messaging (email/SMS) for money + match events.
//
// Drivers are selected by env and are entirely OPTIONAL: with no keys set, every
// send is a safe no-op (logged in dev only), so the app behaves exactly as it
// does today until the founder wires Resend (email) and/or Twilio (SMS). All
// sends are best-effort and NEVER throw — a messaging failure must never break a
// booking or payment flow. Server-only (reads secret env, uses fetch).

type EmailInput = { to: string; subject: string; text: string; html?: string };
type SmsInput = { to: string; body: string };

/** Email is live only when both the Resend key and a verified from-address exist. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

/** SMS is live only when all three Twilio values exist. */
export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM,
  );
}

/** Send a transactional email via Resend. No-op (returns sent:false) if unconfigured. */
export async function sendEmail(input: EmailInput): Promise<{ sent: boolean }> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[messaging] email skipped (not configured) → ${input.to}: ${input.subject}`,
      );
    }
    return { sent: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM,
        to: input.to,
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
      }),
    });
    if (!res.ok) {
      console.error(
        `[messaging] Resend error ${res.status}: ${await res.text().catch(() => "")}`,
      );
      return { sent: false };
    }
    return { sent: true };
  } catch (e) {
    console.error("[messaging] email send failed:", (e as Error).message);
    return { sent: false };
  }
}

/** Send a transactional SMS via Twilio. No-op (returns sent:false) if unconfigured. */
export async function sendSms(input: SmsInput): Promise<{ sent: boolean }> {
  if (!isSmsConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[messaging] sms skipped (not configured) → ${input.to}`);
    }
    return { sent: false };
  }
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const auth = Buffer.from(
      `${sid}:${process.env.TWILIO_AUTH_TOKEN}`,
    ).toString("base64");
    const form = new URLSearchParams({
      To: input.to,
      From: process.env.TWILIO_FROM!,
      Body: input.body,
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );
    if (!res.ok) {
      console.error(`[messaging] Twilio error ${res.status}`);
      return { sent: false };
    }
    return { sent: true };
  } catch (e) {
    console.error("[messaging] sms send failed:", (e as Error).message);
    return { sent: false };
  }
}
