import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, grantPurchasedLeadAccess, grantMonthlyAllowance, notify } from "@asaplocal/core";
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

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
