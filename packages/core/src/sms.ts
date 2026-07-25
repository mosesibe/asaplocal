import twilio from "twilio";

const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;
const FROM = process.env.TWILIO_FROM_NUMBER;

export async function sendSms(opts: { to: string; body: string }) {
  if (!client || !FROM) {
    console.warn(`[sms:dev] Skipping send (no TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER). To=${opts.to} Body=${opts.body}`);
    return;
  }
  await client.messages.create({ to: opts.to, from: FROM, body: opts.body });
}
