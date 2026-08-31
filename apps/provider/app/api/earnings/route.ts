import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { computeProviderBalance } from "@asaplocal/core";

// JSON counterpart to /earnings (a server component that queries Prisma
// directly) — needed for the mobile app's Earnings overview screen, which
// has no server component to fetch this in.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { subscription: true, leadCreditWallet: true },
  });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const [balance, settledCount, lastPayout, payoutCount] = await Promise.all([
    computeProviderBalance(business.id),
    prisma.booking.count({ where: { businessId: business.id, settledAt: { not: null } } }),
    prisma.payout.findFirst({ where: { businessId: business.id }, orderBy: { paidAt: "desc" } }),
    prisma.payout.count({ where: { businessId: business.id } }),
  ]);

  return NextResponse.json({
    balance,
    settledCount,
    lastPayoutAt: lastPayout?.paidAt ?? null,
    payoutCount,
    payoutsEnabled: business.payoutsEnabled,
    plan: business.subscription?.plan ?? "FREE",
    leadAllowanceRemaining: business.subscription
      ? Math.max(0, business.subscription.monthlyLeadAllowance - business.subscription.leadAllowanceUsed)
      : 0,
    leadCreditBalance: business.leadCreditWallet?.balance ?? 0,
  });
}
