/**
 * Normalises a phone number to E.164 (`+44…`), defaulting to UK numbering.
 *
 * Twilio works out the country of a national-format number ("07752 123456")
 * from the `From` number on the message. Sending through a Messaging Service
 * means there is no `From` to infer from, so anything that isn't already E.164
 * comes back as error 21211 "Invalid To phone number" — and every number this
 * platform has stored so far is national format, since nothing normalises them
 * on the way in.
 *
 * Deliberately conservative: a number this can't confidently place is returned
 * stripped of separators but otherwise untouched, so Twilio rejects it loudly
 * rather than the platform quietly texting someone else's phone.
 */
export function toE164(raw: string, defaultCallingCode = "44"): string {
  const cleaned = raw.replace(/[\s()\-.]/g, "");

  // Already E.164.
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) return cleaned;
  // International access prefix, e.g. 0044 7752 123456.
  if (/^00[1-9]\d{7,14}$/.test(cleaned)) return `+${cleaned.slice(2)}`;
  // National format with a trunk "0", e.g. 07752 123456 or 0161 496 0000.
  if (/^0\d{9,10}$/.test(cleaned)) return `+${defaultCallingCode}${cleaned.slice(1)}`;
  // A UK mobile that lost its leading 0 somewhere, e.g. 7752123456.
  if (defaultCallingCode === "44" && /^7\d{9}$/.test(cleaned)) return `+44${cleaned}`;

  return cleaned;
}
