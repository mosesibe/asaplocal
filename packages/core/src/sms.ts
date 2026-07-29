import twilio from "twilio";

function createClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid?.startsWith("AC") || !authToken) return null;
  try {
    return twilio(accountSid, authToken);
  } catch {
    return null;
  }
}

const client = createClient();
const FROM = process.env.TWILIO_FROM_NUMBER;

export async function sendSms(opts: { to: string; body: string }) {
  if (!client || !FROM) {
    console.warn(`[sms:dev] Skipping send (no TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER). To=${opts.to} Body=${opts.body}`);
    return;
  }
  await client.messages.create({ to: opts.to, from: FROM, body: opts.body });
}
