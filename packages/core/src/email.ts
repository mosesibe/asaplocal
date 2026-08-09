import { Resend } from "resend";
import { escapeHtml } from "./validations";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "AsapLocal <noreply@asaplocal.pro>";

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (!resend) {
    console.warn(`[email:dev] Skipping send (no RESEND_API_KEY). To=${opts.to} Subject=${opts.subject}`);
    return;
  }
  // The Resend SDK reports API-level failures (bad key, unverified domain,
  // etc.) via a returned `error` object instead of throwing — a caller that
  // only awaits the call sees no exception and no email, silently. Surface
  // it in logs and throw so upstream `.catch()`s at least know a send failed.
  const { error } = await resend.emails.send({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html });
  if (error) {
    console.error(`[email] Resend send failed. To=${opts.to} Subject=${opts.subject}`, error);
    throw new Error(error.message ?? "Failed to send email");
  }
}

export const emailTemplates = {
  verifyEmail: (link: string) => `
    <h2>Confirm your AsapLocal account</h2>
    <p>Click the link below to verify your email address:</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link expires in 24 hours.</p>`,
  passwordReset: (link: string) => `
    <h2>Reset your password</h2>
    <p>Click the link below to choose a new password:</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
  // Every field here originates from a user-driven chat, so each one is
  // escaped rather than interpolated raw — this body must never be able to
  // carry markup.
  diyFixGuide: (opts: { summary: string; toolkit: string[]; steps: string[]; ctaUrl: string }) => `
    <h2>Your fix guide from AI Buddy</h2>
    <p>${escapeHtml(opts.summary)}</p>
    ${
      opts.toolkit.length
        ? `<h3>What you'll need</h3><ul>${opts.toolkit.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
        : ""
    }
    ${
      opts.steps.length
        ? `<h3>Steps</h3><ol>${opts.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`
        : ""
    }
    <p style="margin-top:24px">Not going to plan? <a href="${opts.ctaUrl}">Get a quote from a local pro</a>.</p>
    <p style="color:#6b7280;font-size:12px">This guide is general DIY guidance, not professional advice. If the job involves gas, mains electrics or structural work, use a qualified tradesperson.</p>`,
  providerAccountInvite: (link: string) => `
    <h2>An AsapLocal Business account was created for you</h2>
    <p>Click the link below to set your password and get started:</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link expires in 1 hour. Once you've set a password, you'll be able to log in and finish setting up your business profile.</p>`,
  newLeadAvailable: (businessName: string, jobTitle: string, city: string, link: string) => `
    <h2>New lead near you, ${businessName}</h2>
    <p><strong>${jobTitle}</strong> — ${city}</p>
    <p><a href="${link}">View and claim this lead</a></p>`,
  quoteReceived: (jobTitle: string, link: string) => `
    <h2>You've received a new quote</h2>
    <p>For: <strong>${jobTitle}</strong></p>
    <p><a href="${link}">View quote</a></p>`,
  bookingConfirmed: (link: string) => `
    <h2>Your booking is confirmed</h2>
    <p><a href="${link}">View booking details</a></p>`,
  referenceRequest: (businessName: string, refereeName: string, link: string) => `
    <h2>${businessName} listed you as a reference</h2>
    <p>Hi ${refereeName}, ${businessName} is building trust on AsapLocal and listed you as someone who can vouch for their work.</p>
    <p>It only takes a minute — click below to confirm and optionally leave a short note.</p>
    <p><a href="${link}">Confirm reference</a></p>`,
  insuranceExpiring: (businessName: string, policyType: string, expiryDate: string, link: string) => `
    <h2>Your ${policyType} insurance is expiring soon</h2>
    <p>Hi ${businessName}, your policy expires on ${expiryDate}. Renew and re-upload it to keep your verified status.</p>
    <p><a href="${link}">Update insurance</a></p>`,
};
