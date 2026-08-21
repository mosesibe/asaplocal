import { randomBytes } from "crypto";
import { prisma } from "@asaplocal/db";
import { sendEmail } from "./email";

/**
 * Version of the Terms & Privacy Policy currently in force. Lives here so both
 * apps stamp the same value — recording different versions for the same terms
 * would make it impossible to tell what a given user actually agreed to.
 */
export const TERMS_VERSION = "2026-08-04";

/**
 * Marketing email — gated on consent, always carrying an unsubscribe link.
 *
 * Deliberately a *separate* function from sendEmail(). Booking confirmations,
 * invoices, payout statements and job updates are service messages: they are
 * not marketing, are not consent-gated, and must keep sending to someone who
 * has opted out. Routing those through this helper would silently suppress a
 * customer's receipt — so the split is enforced by having two entry points
 * rather than a flag on one.
 */

/** Stable per-user token so an unsubscribe link works without a login. */
export async function getUnsubscribeToken(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { unsubscribeToken: true } });
  if (user.unsubscribeToken) return user.unsubscribeToken;
  const token = randomBytes(24).toString("base64url");
  await prisma.user.update({ where: { id: userId }, data: { unsubscribeToken: token } });
  return token;
}

export function unsubscribeUrl(token: string) {
  return `${process.env.NEXT_PUBLIC_WEB_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * Records a marketing preference change with evidence of when and where it was
 * given — a bare boolean can't demonstrate valid consent if it's ever queried.
 * Consent timestamp is only stamped when opting *in*.
 */
export async function setMarketingPreferences(
  userId: string,
  prefs: { email?: boolean; sms?: boolean },
  source: string
) {
  const optingIn = prefs.email === true || prefs.sms === true;
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(prefs.email === undefined ? {} : { marketingEmail: prefs.email }),
      ...(prefs.sms === undefined ? {} : { marketingSms: prefs.sms }),
      ...(optingIn ? { marketingConsentAt: new Date(), marketingConsentSource: source } : {}),
    },
  });
}

/**
 * Sends only to users who have opted in, appending an unsubscribe line.
 * Returns how many were skipped so a campaign can be reconciled.
 */
export async function sendMarketingEmail(opts: {
  userIds: string[];
  subject: string;
  build: (unsubscribe: string) => { html: string; text?: string };
}): Promise<{ sent: number; skipped: number }> {
  const users = await prisma.user.findMany({
    where: { id: { in: opts.userIds }, marketingEmail: true, status: "ACTIVE" },
    select: { id: true, email: true },
  });

  let sent = 0;
  for (const user of users) {
    const url = unsubscribeUrl(await getUnsubscribeToken(user.id));
    const body = opts.build(url);
    try {
      await sendEmail({ to: user.email, subject: opts.subject, ...body });
      sent++;
    } catch {
      // one bad address must not abort the rest of the campaign
    }
  }
  return { sent, skipped: opts.userIds.length - sent };
}
