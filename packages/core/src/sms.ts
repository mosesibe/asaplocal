import twilio from "twilio";
import { toE164 } from "./phone";

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
// A Messaging Service picks the sender per destination country: the
// "ASAPLocal" alphanumeric sender ID where it's allowed (UK and most of
// Europe), falling back to the long code where it isn't (notably the US and
// Canada, which reject alphanumeric senders outright). Preferred over
// TWILIO_FROM_NUMBER when set, since this codebase never validates that a
// user's phone number is UK.
const MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

/** Whichever sender Twilio should attribute the message to, or null if none is configured. */
function sender() {
  if (MESSAGING_SERVICE_SID?.startsWith("MG")) return { messagingServiceSid: MESSAGING_SERVICE_SID };
  if (FROM) return { from: FROM };
  return null;
}

export async function sendSms(opts: { to: string; body: string }) {
  // Must be E.164: a Messaging Service send has no `From` for Twilio to infer
  // the country from, so a national-format number is rejected outright.
  const to = toE164(opts.to);
  const via = sender();
  if (!client || !via) {
    console.warn(
      `[sms:dev] Skipping send (no TWILIO_ACCOUNT_SID/AUTH_TOKEN, and no TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER). To=${to} Body=${opts.body}`
    );
    return;
  }
  await client.messages.create({ to, body: opts.body, ...via });
}
