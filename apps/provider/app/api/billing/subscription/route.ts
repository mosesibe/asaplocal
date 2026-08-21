import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { stripe, STRIPE_PRICE_IDS, PLAN_LEAD_ALLOWANCE, writeAuditLog } from "@asaplocal/core";
import { z } from "zod";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("change_plan"), plan: z.enum(["PRO", "PREMIUM"]) }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("resume") }),
]);

/**
 * Plan changes on an existing subscription.
 *
 * Upgrading from FREE still goes through Checkout (there's no subscription to
 * modify yet) — that's handled by /api/billing/checkout. This route covers
 * switching between paid plans, cancelling, and undoing a cancellation, none
 * of which were possible before: providers could only ever upgrade.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { subscription: true },
  });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const sub = business.subscription;
  if (!sub?.stripeSubscriptionId) {
    return NextResponse.json({ message: "No active subscription to change. Choose a plan to get started." }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid request" }, { status: 422 });

  if (parsed.data.action === "cancel" || parsed.data.action === "resume") {
    const cancelAtPeriodEnd = parsed.data.action === "cancel";
    // Cancel at period end rather than immediately — they've paid for the
    // current month and shouldn't lose the allowance they're mid-way through.
    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: cancelAtPeriodEnd });
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd, currentPeriodEnd: new Date(updated.current_period_end * 1000) },
    });
    await writeAuditLog({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: cancelAtPeriodEnd ? "subscription.cancel" : "subscription.resume",
      targetType: "Subscription",
      targetId: sub.id,
    });
    return NextResponse.json({ ok: true, cancelAtPeriodEnd });
  }

  const plan = parsed.data.plan;
  if (plan === sub.plan) return NextResponse.json({ message: "You're already on that plan" }, { status: 400 });

  const priceId = plan === "PRO" ? STRIPE_PRICE_IDS.PRO_MONTHLY : STRIPE_PRICE_IDS.PREMIUM_MONTHLY;
  const current = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
  const itemId = current.items.data[0]?.id;
  if (!itemId) return NextResponse.json({ message: "Couldn't read your subscription — contact support." }, { status: 502 });

  const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    items: [{ id: itemId, price: priceId }],
    // Charge/credit the difference immediately so an upgrade takes effect now
    // and a downgrade refunds the unused remainder.
    proration_behavior: "always_invoice",
    cancel_at_period_end: false,
  });

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      plan,
      status: "ACTIVE",
      stripePriceId: priceId,
      cancelAtPeriodEnd: false,
      monthlyLeadAllowance: PLAN_LEAD_ALLOWANCE[plan],
      currentPeriodEnd: new Date(updated.current_period_end * 1000),
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "subscription.change_plan",
    targetType: "Subscription",
    targetId: sub.id,
    metadata: { from: sub.plan, to: plan },
  });

  return NextResponse.json({ ok: true, plan });
}
