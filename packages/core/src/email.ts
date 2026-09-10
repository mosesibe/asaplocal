import { Resend } from "resend";
import { card, type EmailBody } from "./email-layout";

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
 * core must not depend on a React package just to render an email. Exported
 * so other core modules (e.g. payouts.ts, for notify() body text) can reuse
 * it instead of duplicating an Intl formatter.
 */
export function formatPence(pence: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(pence / 100);
}

/**
 * Every template returns { html, text } — spread it into sendEmail:
 *   sendEmail({ to, subject, ...emailTemplates.verifyEmail(link) })
 */
export const emailTemplates = {
  verifyEmail: (link: string): EmailBody =>
    card({
      badge: "Account",
      title: "Confirm your email address",
      preheader: "Confirm your email address to finish setting up your account.",
      greeting: "Welcome to AsapLocal.",
      blocks: [
        {
          kind: "paragraph",
          text: "You're one step from finishing your account. Use the button below and you're done — it works for the next 24 hours.",
        },
      ],
      cta: { label: "Verify my email address", url: link },
      afterCta: [
        {
          kind: "fallbackLink",
          intro: "If the button doesn't work, paste this into your browser:",
          url: link,
        },
      ],
      footnote: "Didn't create an account? Nothing will happen if you ignore this.",
    }),

  passwordReset: (link: string): EmailBody =>
    card({
      badge: "Security",
      title: "Reset your password",
      preheader: "Your password reset link — valid for 1 hour.",
      blocks: [
        {
          kind: "paragraph",
          text: "Use the button below to choose a new password. It expires in 1 hour.",
        },
      ],
      cta: { label: "Choose a new password", url: link },
      afterCta: [
        {
          kind: "fallbackLink",
          intro: "If the button doesn't work, paste this into your browser:",
          url: link,
        },
      ],
      footnote: "Didn't request this? You can safely ignore this email — your password won't change.",
    }),

  providerAccountInvite: (link: string): EmailBody =>
    card({
      badge: "Account",
      title: "Your AsapLocal Business account is ready",
      preheader: "Set a password to finish setting up your business profile.",
      greeting: "An account has been created for you.",
      blocks: [
        {
          kind: "paragraph",
          text: "Set a password using the button below and you'll be taken straight through to finish setting up your business profile. The link expires in 1 hour.",
        },
      ],
      cta: { label: "Set my password", url: link },
      afterCta: [
        {
          kind: "fallbackLink",
          intro: "If the button doesn't work, paste this into your browser:",
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
    card({
      badge: "New lead",
      title: jobTitle,
      preheader: `${jobTitle} in ${city} — five providers can claim it before it closes.`,
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
    card({
      badge: "New bid",
      title: "You've received a new quote",
      preheader: `A provider has quoted on ${jobTitle}.`,
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
    card({
      badge: "Booking confirmed",
      title: "Your booking is confirmed",
      preheader: "Your payment went through and your provider has been notified.",
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
    card({
      badge: "Payment received",
      badgeVariant: "success",
      title: "You've been paid — job confirmed",
      preheader: `The customer has paid for ${opts.jobTitle} — it's on your calendar.`,
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
    card({
      badge: `Invoice ${opts.invoiceRef}`,
      title: "Your job is paid in full",
      preheader: `Receipt for ${opts.jobTitle} with ${opts.businessName} — ${formatPence(opts.totalPence)}.`,
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
    card({
      badge: opts.transferred ? "Payout sent" : "Payout pending",
      badgeVariant: opts.transferred ? "success" : "neutral",
      title: opts.transferred ? "You've been paid" : "Your earnings are ready",
      preheader: opts.transferred
        ? `${formatPence(opts.netPence)} is on its way to your bank for ${opts.jobTitle}.`
        : `${formatPence(opts.netPence)} is waiting — connect your bank to receive it.`,
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

  /**
   * A lump-sum transfer to the provider's bank — either the automatic backlog
   * sweep on completing Connect onboarding (bookingsPaid set), or a manual
   * withdrawal of a chosen amount (bookingsPaid omitted).
   */
  payoutSweepProvider: (opts: { businessName: string; totalPence: number; bookingsPaid?: number; link: string }): EmailBody =>
    card({
      badge: "Payout sent",
      badgeVariant: "success",
      title: "Your payout is on its way",
      preheader: `${formatPence(opts.totalPence)} is on its way to your bank.`,
      blocks: [
        {
          kind: "paragraph",
          text: `Hi ${opts.businessName} — ${formatPence(opts.totalPence)} has been sent to your connected bank account${
            opts.bookingsPaid ? ` across ${opts.bookingsPaid} job${opts.bookingsPaid > 1 ? "s" : ""}` : ""
          }.`,
        },
      ],
      cta: { label: "View your banking page", url: opts.link },
      footnote: "Stripe pays this into your bank on your usual payout schedule.",
    }),

  /**
   * Security notice sent whenever a bank account finishes Stripe Connect
   * onboarding — not an earnings update, so it always includes a "wasn't
   * you?" footnote since a bank change is exactly the kind of event an
   * account-takeover would try to make.
   */
  bankAccountConnected: (opts: { businessName: string; link: string }): EmailBody =>
    card({
      badge: "Security",
      title: "Bank account connected",
      preheader: "A bank account was just connected to your AsapLocal Business account.",
      greeting: `Hi ${opts.businessName},`,
      blocks: [
        {
          kind: "paragraph",
          text: "A bank account was just connected to your AsapLocal Business account, and you're now set up to receive payouts.",
        },
      ],
      cta: { label: "Review your banking details", url: opts.link },
      footnote: "Didn't do this yourself? Contact us immediately — someone else may have access to your account.",
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
    card({
      badge: "Extra work proposed",
      title: `${opts.businessName} has proposed extra work`,
      preheader: `+${formatPence(opts.amountPence)} for ${opts.description} — nothing is charged unless you accept.`,
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
    card({
      badge: opts.accepted ? "Extra approved" : "Extra declined",
      badgeVariant: opts.accepted ? "success" : "neutral",
      title: opts.accepted ? "Your extra work was approved" : "Your extra work was declined",
      preheader: opts.accepted
        ? `${opts.description} was approved — ${formatPence(opts.amountPence)} added to the job.`
        : `${opts.description} was declined — the job stands at the original price.`,
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
    card({
      badge: "Job finished",
      title: "Your job is marked as done",
      preheader: `${opts.businessName} has finished ${opts.jobTitle} — review and confirm so they can be paid.`,
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
    card({
      badge: "Signed off",
      badgeVariant: "success",
      title: "The customer confirmed the job is complete",
      preheader: `${opts.jobTitle} is signed off.`,
      blocks: [
        {
          kind: "paragraph",
          text: `Hi ${opts.businessName} — your customer has reviewed the work log and confirmed this job as complete.`,
        },
        { kind: "highlight", title: opts.jobTitle },
      ],
      cta: { label: "View booking", url: opts.link },
    }),

  /** Customer disputed a completed job instead of accepting it. */
  disputeRaisedProvider: (opts: { businessName: string; jobTitle: string; reason: string; link: string }): EmailBody =>
    card({
      badge: "Issue reported",
      title: "The customer reported an issue with this job",
      preheader: `An issue was raised on ${opts.jobTitle} — respond to move it forward.`,
      blocks: [
        {
          kind: "paragraph",
          text: `Hi ${opts.businessName} — instead of accepting completion, your customer has raised an issue. Take a look, respond, and mark it resolved once it's sorted.`,
        },
        { kind: "highlight", title: opts.jobTitle, meta: opts.reason },
      ],
      cta: { label: "View and respond", url: opts.link },
      footnote: "The booking won't be signed off (or paid out) until the customer reconfirms.",
    }),

  /** Provider responded to a dispute — customer needs to reconfirm completion. */
  disputeResolvedCustomer: (opts: { businessName: string; jobTitle: string; response: string; link: string }): EmailBody =>
    card({
      badge: "Response received",
      title: `${opts.businessName} responded to your issue`,
      preheader: `${opts.businessName} responded on ${opts.jobTitle} — review and confirm if it's sorted.`,
      blocks: [
        {
          kind: "paragraph",
          text: "They've marked it resolved. Take a look at their response, then confirm completion — or raise it again if it's still not right.",
        },
        { kind: "highlight", title: opts.jobTitle, meta: opts.response },
      ],
      cta: { label: "Review and confirm", url: opts.link },
    }),

  /** Customer left a rating/review on a completed booking. */
  reviewReceivedProvider: (opts: {
    businessName: string;
    jobTitle: string;
    rating: number;
    comment?: string | null;
    link: string;
  }): EmailBody =>
    card({
      badge: "New review",
      badgeVariant: "success",
      title: `You've received a ${opts.rating}-star review`,
      preheader: `A customer left a ${opts.rating}-star review for ${opts.jobTitle}.`,
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
    card({
      badge: "Reference request",
      title: `${businessName} listed you as a reference`,
      preheader: `${businessName} asked you to vouch for their work on AsapLocal.`,
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
      footnote: "Don't know this business? Ignore this email and nothing will be recorded.",
    }),

  insuranceExpiring: (
    businessName: string,
    policyType: string,
    expiryDate: string,
    link: string,
  ): EmailBody =>
    card({
      badge: "Action needed",
      title: "Your insurance is expiring",
      preheader: `Your ${policyType} policy expires ${expiryDate} — renew to keep your trust tier.`,
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
    card({
      badge: "Fix guide",
      title: "Your fix guide from AI Buddy",
      preheader: opts.summary,
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
