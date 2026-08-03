import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, grantPurchasedLeadAccess, grantMonthlyAllowance, notify, retrieveIdentityVerificationSession, recomputeTrustTier } from "@asaplocal/core";
import { prisma } from "@asaplocal/db";

/**
 * Handles lead-purchase, subscription, and lead-credit-topup events for the
 * provider app. As with the customer app's webhook, signature verification
 * against the raw body is mandatory and this route is exempt from CSRF
 * protection (Stripe signs the payload instead of sending cookies).
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig ?? "", process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch (err) {
    console.error("[stripe webhook:provider] signature verification failed", err);
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const cs = event.data.object as Stripe.Checkout.Session;
      const meta = cs.metadata ?? {};

      if (meta.paymentType === "LEAD_PURCHASE" && meta.leadId && meta.businessId) {
        await grantPurchasedLeadAccess(
          meta.leadId,
          meta.businessId,
          cs.amount_total ?? 0,
          typeof cs.payment_intent === "string" ? cs.payment_intent : ""
        );
        const business = await prisma.business.findUnique({ where: { id: meta.businessId } });
        if (business) await notify(business.ownerId, "LEAD_CLAIMED", "Lead purchased", "You now have access to this lead.", `/leads`);
      }

      if (meta.paymentType === "LEAD_CREDIT_TOPUP" && meta.businessId) {
        const credits = Number(meta.creditsQty ?? 0);
        const wallet = await prisma.leadCreditWallet.upsert({
          where: { businessId: meta.businessId },
          update: { balance: { increment: credits } },
          create: { businessId: meta.businessId, balance: credits },
        });
        await prisma.leadCreditTransaction.create({
          data: { walletId: wallet.id, type: "TOPUP_PURCHASE", amount: credits, description: `Purchased ${credits} lead credits` },
        });
        await prisma.payment.create({
          data: {
            userId: (await prisma.business.findUniqueOrThrow({ where: { id: meta.businessId } })).ownerId,
            businessId: meta.businessId,
            type: "LEAD_CREDIT_TOPUP",
            status: "SUCCEEDED",
            amountPence: cs.amount_total ?? 0,
            stripePaymentIntentId: typeof cs.payment_intent === "string" ? cs.payment_intent : undefined,
          },
        });
      }

      if (meta.paymentType === "SUBSCRIPTION" && meta.businessId && typeof cs.subscription === "string") {
        const stripeSub = await stripe.subscriptions.retrieve(cs.subscription);
        const plan = (meta.plan as "FREE" | "PRO" | "PREMIUM" | "ENTERPRISE") ?? "PRO";
        await prisma.subscription.upsert({
          where: { businessId: meta.businessId },
          update: {
            plan,
            status: "ACTIVE",
            stripeCustomerId: typeof cs.customer === "string" ? cs.customer : undefined,
            stripeSubscriptionId: stripeSub.id,
            stripePriceId: stripeSub.items.data[0]?.price.id,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          },
          create: {
            businessId: meta.businessId,
            plan,
            status: "ACTIVE",
            stripeCustomerId: typeof cs.customer === "string" ? cs.customer : undefined,
            stripeSubscriptionId: stripeSub.id,
            stripePriceId: stripeSub.items.data[0]?.price.id,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          },
        });
        await grantMonthlyAllowance(meta.businessId, plan);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
      if (existing) {
        await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            status: sub.status === "active" ? "ACTIVE" : sub.status === "past_due" ? "PAST_DUE" : sub.status === "canceled" ? "CANCELED" : "INCOMPLETE",
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            ...(event.type === "customer.subscription.deleted" ? { plan: "FREE", monthlyLeadAllowance: 0 } : {}),
          },
        });
      }
      break;
    }

    case "identity.verification_session.verified": {
      const vs = event.data.object as Stripe.Identity.VerificationSession;
      const record = await prisma.identityVerification.findUnique({ where: { stripeVerificationSessionId: vs.id } });
      if (record) {
        const full = await retrieveIdentityVerificationSession(vs.id);
        const outputs = full.verified_outputs;
        const fullName = outputs?.first_name || outputs?.last_name ? `${outputs.first_name ?? ""} ${outputs.last_name ?? ""}`.trim() : null;
        await prisma.identityVerification.update({
          where: { id: record.id },
          data: { status: "VERIFIED", verifiedAt: new Date(), extractedFullName: fullName, lastError: null },
        });
        const business = await prisma.business.findUnique({ where: { id: record.businessId } });
        if (business) await notify(business.ownerId, "VERIFICATION_UPDATE", "Identity verified", "Your identity has been verified.", "/verification/identity");
        await recomputeTrustTier(record.businessId);
      }
      break;
    }

    case "identity.verification_session.requires_input": {
      const vs = event.data.object as Stripe.Identity.VerificationSession;
      const record = await prisma.identityVerification.findUnique({ where: { stripeVerificationSessionId: vs.id } });
      if (record) {
        // Unrecoverable errors (e.g. expired/invalid document) get REJECTED;
        // anything else is treated as recoverable — the provider can retry.
        const unrecoverable = ["document_expired", "document_type_not_supported", "under_supported_age"];
        const errorCode = vs.last_error?.code;
        const status = errorCode && unrecoverable.includes(errorCode) ? "REJECTED" : "MORE_INFO_REQUESTED";
        await prisma.identityVerification.update({
          where: { id: record.id },
          data: { status, lastError: vs.last_error?.reason ?? "Verification requires more information" },
        });
        const business = await prisma.business.findUnique({ where: { id: record.businessId } });
        if (business) await notify(business.ownerId, "VERIFICATION_UPDATE", "Identity verification needs attention", vs.last_error?.reason ?? undefined, "/verification/identity");
        await recomputeTrustTier(record.businessId);
      }
      break;
    }

    case "identity.verification_session.processing":
      break;

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const business = await prisma.business.findFirst({ where: { stripeAccountId: account.id } });
      if (business) {
        const payoutsEnabled = !!account.charges_enabled && !!account.payouts_enabled;
        await prisma.business.update({
          where: { id: business.id },
          data: {
            payoutsEnabled,
            ...(payoutsEnabled && !business.stripeConnectOnboardedAt ? { stripeConnectOnboardedAt: new Date() } : {}),
          },
        });
        if (payoutsEnabled && !business.payoutsEnabled) {
          await notify(business.ownerId, "VERIFICATION_UPDATE", "Bank account connected", "You're all set up to receive payouts.", "/verification/banking");
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
