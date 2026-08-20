import { Resend } from "resend";
import { docket, letter, type EmailBody } from "./email-layout";

export * from "./email-layout";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const FROM = process.env.EMAIL_FROM ?? "AsapLocal <noreply@asaplocal.pro>";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!resend) {
    console.warn(
      `[email:dev] Skipping send (no RESEND_API_KEY). To=${opts.to} Subject=${opts.subject}`,
    );
    return;
  }
  // The Resend SDK reports API-level failures (bad key, unverified domain,
  // etc.) via a returned `error` object instead of throwing — a caller that
  // only awaits the call sees no exception and no email, silently. Surface
  // it in logs and throw so upstream `.catch()`s at least know a send failed.
  const { error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    // A plain-text alternative measurably helps deliverability; sending
    // HTML-only looks like bulk mail to most spam filters.
    ...(opts.text ? { text: opts.text } : {}),
  });
  if (error) {
    console.error(
      `[email] Resend send failed. To=${opts.to} Subject=${opts.subject}`,
      error,
    );
    throw new Error(error.message ?? "Failed to send email");
  }
}

/**
 * Local money formatter — packages/ui owns the app-facing formatPence(), but
 * core must not depend on a React package just to render an email.
 */
function formatPence(pence: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(pence / 100);
}

/**
 * Every template returns { html, text } — spread it into sendEmail:
 *   sendEmail({ to, subject, ...emailTemplates.verifyEmail(link) })
 *
 * Auth mail (verify / reset / invite) uses the plainer `letter` shell on
 * purpose: heavily-branded security email reads as phishing, and plainer
 * mail lands in the inbox more reliably. Everything else uses `docket`.
 */
export const emailTemplates = {
  verifyEmail: (link: string): EmailBody =>
    letter({
      title: "Confirm your email address",
      greeting: "Welcome to AsapLocal.",
      blocks: [
        {
          kind: "paragraph",
          text: "You're one step from finishing your account. Use the link below and you're done — it works for the next 24 hours.",
        },
      ],
      cta: { label: "Verify my email address", url: link },
      afterCta: [
        {
          kind: "fallbackLink",
          intro: "If the link doesn't work, paste this into your browser:",
          url: link,
        },
      ],
      footnote:
        "Didn't create an account? Nothing will happen if you ignore this.",
    }),

  passwordReset: (link: string): EmailBody =>
    letter({
      title: "Reset your password",
      blocks: [
        {
          kind: "paragraph",
          text: "Use the link below to choose a new password. It expires in 1 hour.",
        },
      ],
      cta: { label: "Choose a new password", url: link },
      afterCta: [
        {
          kind: "fallbackLink",
          intro: "If the link doesn't work, paste this into your browser:",
          url: link,
        },
      ],
      footnote:
        "Didn't request this? You can safely ignore this email — your password won't change.",
    }),

  providerAccountInvite: (link: string): EmailBody =>
    letter({
      title: "Your AsapLocal Business account is ready",
      greeting: "An account has been created for you.",
      blocks: [
        {
          kind: "paragraph",
          text: "Set a password using the link below and you'll be taken straight through to finish setting up your business profile. The link expires in 1 hour.",
        },
      ],
      cta: { label: "Set my password", url: link },
      afterCta: [
        {
          kind: "fallbackLink",
          intro: "If the link doesn't work, paste this into your browser:",
          url: link,
        },
      ],
      footnote: "Not expecting this? Let us know and we'll remove the account.",
    }),

  newLeadAvailable: (
    businessName: string,
    jobTitle: string,
    city: string,
    link: string,
  ): EmailBody =>
    docket({
      eyebrow: "New lead",
      title: jobTitle,
      blocks: [
        {
          kind: "paragraph",
          text: `Hi ${businessName} — this job matches your trades and covers your service area.`,
        },
        {
          kind: "data",
          rows: [
            ["Location", city],
            ["Status", "Available now"],
          ],
        },
        {
          kind: "paragraph",
          text: "Only five providers can take a lead before it closes.",
        },
      ],
      cta: { label: "View and claim", url: link },
      footnote: `Sent because your service area covers ${city}.`,
    }),

  quoteReceived: (jobTitle: string, link: string): EmailBody =>
    docket({
      eyebrow: "Quote received",
      title: "You've received a new quote",
      blocks: [
        {
          kind: "paragraph",
          text: "A provider has quoted on your job. Compare it against any others before you accept.",
        },
        { kind: "highlight", title: jobTitle },
      ],
      cta: { label: "View quote", url: link },
    }),

  bookingConfirmed: (link: string, timeline?: { label: string; at: Date }[]): EmailBody =>
    docket({
      eyebrow: "Booking confirmed",
      title: "Your booking is confirmed",
      blocks: [
        {
          kind: "paragraph",
          text: "Your payment went through and your provider has been notified. You can message them and see the full details from your booking.",
        },
        ...(timeline?.length ? [{ kind: "timeline" as const, label: "Timeline", entries: timeline }] : []),
      ],
      cta: { label: "View booking details", url: link },
    }),

  paymentReceivedProvider: (opts: {
    businessName: string;
    jobTitle: string;
    link: string;
    timeline?: { label: string; at: Date }[];
  }): EmailBody =>
    docket({
      eyebrow: "Payment received",
      title: "You've been paid — job confirmed",
      blocks: [
        {
          kind: "paragraph",
          text: `Hi ${opts.businessName} — the customer has paid and this job is now confirmed. It's on your calendar.`,
        },
        { kind: "highlight", title: opts.jobTitle },
        ...(opts.timeline?.length ? [{ kind: "timeline" as const, label: "Timeline", entries: opts.timeline }] : []),
      ],
      cta: { label: "View booking", url: opts.link },
    }),

  /** Itemised invoice sent to the customer once a job is paid in full. */
  invoicePaidCustomer: (opts: {
    invoiceRef: string;
    businessName: string;
    jobTitle: string;
    basePence: number;
    extras: { description: string; amountPence: number }[];
    payments: { label: string; amountPence: number; paidAt: Date }[];
    totalPence: number;
    link: string;
  }): EmailBody =>
    docket({
      eyebrow: `Invoice ${opts.invoiceRef}`,
      title: "Your job is paid in full",
      blocks: [
        {
          kind: "paragraph",
          text: `Thanks — here's your receipt for ${opts.jobTitle} with ${opts.businessName}. Nothing further is owed.`,
        },
        {
          kind: "data",
          rows: [
            ["Agreed price", formatPence(opts.basePence)],
            ...opts.extras.map((e): [string, string] => [`Extra: ${e.description}`, `+${formatPence(e.amountPence)}`]),
            ["Total", formatPence(opts.totalPence)],
          ],
        },
        {
          kind: "data",
          rows: opts.payments.map((p): [string, string] => [
            `${p.label} · ${p.paidAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
            formatPence(p.amountPence),
          ]),
        },
      ],
      cta: { label: "View booking", url: opts.link },
      footnote: `Invoice ${opts.invoiceRef} · Keep this for your records.`,
    }),

  /** Payout statement — what the provider earned on a job and what reached them. */
  payoutStatementProvider: (opts: {
    businessName: string;
    jobTitle: string;
    customerName: string;
    completedAt?: Date | null;
    collectedPence: number;
    platformFeePence: number;
    netPence: number;
    transferred: boolean;
    link: string;
  }): EmailBody =>
    docket({
      eyebrow: opts.transferred ? "Payout sent" : "Payout pending",
      title: opts.transferred ? "You've been paid" : "Your earnings are ready",
      blocks: [
        {
          kind: "paragraph",
          text: opts.transferred
            ? `Hi ${opts.businessName} — this job is complete and paid in full, and your share is on its way to your bank.`
            : `Hi ${opts.businessName} — this job is complete and paid in full. Connect your bank account and we'll send your earnings straight away.`,
        },
        {
          kind: "highlight",
          title: opts.jobTitle,
          meta: [opts.customerName, opts.completedAt ? `completed ${opts.completedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : null]
            .filter(Boolean)
            .join(" · "),
        },
        {
          kind: "data",
          rows: [
            ["Customer paid", formatPence(opts.collectedPence)],
            ["Platform commission", `−${formatPence(opts.platformFeePence)}`],
            [opts.transferred ? "Paid to you" : "Owed to you", formatPence(opts.netPence)],
          ],
        },
      ],
      cta: opts.transferred
        ? { label: "View job", url: opts.link }
        : { label: "Connect your bank", url: opts.link },
      footnote: opts.transferred
        ? "Stripe pays this into your bank on your usual payout schedule."
        : "Your earnings are held safely until your bank details are set up.",
    }),

  /** Provider proposed extra work mid-job — the customer must accept before it's billable. */
  variationProposedCustomer: (opts: {
    businessName: string;
    jobTitle: string;
    description: string;
    amountPence: number;
    newTotalPence: number;
    link: string;
  }): EmailBody =>
    docket({
      eyebrow: "Extra work proposed",
      title: `${opts.businessName} has proposed extra work`,
      blocks: [
        {
          kind: "paragraph",
          text: "They've asked to add work beyond the original quote. Nothing is charged unless you accept it.",
        },
        { kind: "highlight", title: opts.description, meta: `+${formatPence(opts.amountPence)}` },
        {
          kind: "data",
          rows: [
            ["Job", opts.jobTitle],
            ["Extra", `+${formatPence(opts.amountPence)}`],
            ["New total if accepted", formatPence(opts.newTotalPence)],
          ],
        },
      ],
      cta: { label: "Review and decide", url: opts.link },
      footnote: "You can decline and the job continues at the original price.",
    }),

  /** Customer accepted or rejected a proposed variation. */
  variationDecidedProvider: (opts: {
    businessName: string;
    jobTitle: string;
    description: string;
    amountPence: number;
    accepted: boolean;
    link: string;
  }): EmailBody =>
    docket({
      eyebrow: opts.accepted ? "Extra approved" : "Extra declined",
      title: opts.accepted ? "Your extra work was approved" : "Your extra work was declined",
      blocks: [
        {
          kind: "paragraph",
          text: opts.accepted
            ? `Hi ${opts.businessName} — the customer approved your proposed extra. It's been added to what they owe on completion.`
            : `Hi ${opts.businessName} — the customer declined your proposed extra, so the job stands at the original price. Talk it through with them if you think it's needed.`,
        },
        { kind: "highlight", title: opts.description, meta: `${formatPence(opts.amountPence)} · ${opts.jobTitle}` },
      ],
      cta: { label: "View booking", url: opts.link },
    }),

  /** Provider finished — customer reviews the work log and confirms completion. */
  jobFinishedCustomer: (opts: {
    businessName: string;
    jobTitle: string;
    workLog: { label: string; at: Date }[];
    durationMinutes?: number | null;
    link: string;
  }): EmailBody =>
    docket({
      eyebrow: "Job finished",
      title: "Your job is marked as done",
      blocks: [
        {
          kind: "paragraph",
          text: `${opts.businessName} has finished the job. Here's what they logged — check it over, then confirm completion so they can be paid out.`,
        },
        { kind: "highlight", title: opts.jobTitle, meta: opts.durationMinutes ? `${opts.durationMinutes} minutes on site` : undefined },
        ...(opts.workLog.length ? [{ kind: "timeline" as const, label: "Work log", entries: opts.workLog }] : []),
      ],
      cta: { label: "Review and confirm", url: opts.link },
      footnote: "Nothing is final until you confirm — raise anything that looks wrong before you do.",
    }),

  /** Customer confirmed completion — the provider's job is signed off. */
  jobCompletedProvider: (opts: { businessName: string; jobTitle: string; link: string }): EmailBody =>
    docket({
      eyebrow: "Signed off",
      title: "The customer confirmed the job is complete",
      blocks: [
        {
          kind: "paragraph",
          text: `Hi ${opts.businessName} — your customer has reviewed the work log and confirmed this job as complete.`,
        },
        { kind: "highlight", title: opts.jobTitle },
      ],
      cta: { label: "View booking", url: opts.link },
    }),

  /** Customer left a rating/review on a completed booking. */
  reviewReceivedProvider: (opts: {
    businessName: string;
    jobTitle: string;
    rating: number;
    comment?: string | null;
    link: string;
  }): EmailBody =>
    docket({
      eyebrow: "New review",
      title: `You've received a ${opts.rating}-star review`,
      blocks: [
        { kind: "paragraph", text: `Hi ${opts.businessName} — a customer has reviewed your work.` },
        {
          kind: "highlight",
          title: `${"★".repeat(opts.rating)}${"☆".repeat(Math.max(0, 5 - opts.rating))}  ${opts.rating}/5`,
          meta: opts.jobTitle,
        },
        ...(opts.comment ? [{ kind: "paragraph" as const, text: `"${opts.comment}"` }] : []),
        { kind: "paragraph", text: "Reviews feed your public rating and trust tier — replying quickly to feedback helps win the next job." },
      ],
      cta: { label: "View your reviews", url: opts.link },
    }),

  referenceRequest: (
    businessName: string,
    refereeName: string,
    link: string,
  ): EmailBody =>
    docket({
      eyebrow: "Reference request",
      title: `${businessName} listed you as a reference`,
      blocks: [
        {
          kind: "paragraph",
          text: `Hi ${refereeName} — ${businessName} is building trust on AsapLocal and named you as someone who can vouch for their work.`,
        },
        {
          kind: "paragraph",
          text: "It takes about a minute: confirm you know them and optionally leave a short note.",
        },
      ],
      cta: { label: "Confirm reference", url: link },
      footnote:
        "Don't know this business? Ignore this email and nothing will be recorded.",
    }),

  insuranceExpiring: (
    businessName: string,
    policyType: string,
    expiryDate: string,
    link: string,
  ): EmailBody =>
    docket({
      eyebrow: "Action needed",
      title: "Your insurance is expiring",
      blocks: [
        {
          kind: "paragraph",
          text: `Hi ${businessName} — one of your verified policies is about to lapse. Renew and re-upload it to keep your verified status and trust tier.`,
        },
        {
          kind: "data",
          rows: [
            ["Policy", policyType],
            ["Expires", expiryDate],
          ],
        },
      ],
      cta: { label: "Update insurance", url: link },
      footnote: "A lapsed policy automatically lowers your trust tier.",
    }),

  diyFixGuide: (opts: {
    summary: string;
    toolkit: string[];
    steps: string[];
    ctaUrl: string;
  }): EmailBody =>
    docket({
      eyebrow: "Fix guide",
      title: "Your fix guide from AI Buddy",
      blocks: [
        { kind: "paragraph", text: opts.summary },
        ...(opts.toolkit.length
          ? [
              {
                kind: "list" as const,
                label: "What you'll need",
                items: opts.toolkit,
              },
            ]
          : []),
        ...(opts.steps.length
          ? [{ kind: "steps" as const, label: "Steps", items: opts.steps }]
          : []),
        {
          kind: "paragraph",
          text: "Not going to plan? A local pro can take it from here.",
        },
      ],
      cta: { label: "Get a quote", url: opts.ctaUrl },
      footnote:
        "General DIY guidance, not professional advice. For gas, mains electrics or structural work, always use a qualified tradesperson.",
    }),
};
