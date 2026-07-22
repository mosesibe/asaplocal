import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "AsapLocal <noreply@asaplocal.app>";

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email:dev] Skipping send (no RESEND_API_KEY). To=${opts.to} Subject=${opts.subject}`);
    return;
  }
  await resend.emails.send({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html });
}

export const emailTemplates = {
  verifyEmail: (link: string) => `
    <h2>Confirm your AsapLocal account</h2>
    <p>Click the link below to verify your email address:</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link expires in 24 hours.</p>`,
  passwordReset: (link: string) => `
    <h2>Reset your password</h2>
    <p><a href="${link}">${link}</a></p>
    <p>If you didn't request this, you can ignore this email.</p>`,
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
};
