import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

// JSON counterpart to /earnings/subscription (a server component that
// queries Prisma directly) — needed for the mobile app's Subscription
// screen, which has no server component to fetch this in.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { subscription: true },
  });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const sub = business.subscription;

  return NextResponse.json({
    plan: sub?.plan ?? "FREE",
    status: sub?.status ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    monthlyLeadAllowance: sub?.monthlyLeadAllowance ?? 0,
    leadAllowanceUsed: sub?.leadAllowanceUsed ?? 0,
    hasStripeSubscription: !!sub?.stripeSubscriptionId,
  });
}
