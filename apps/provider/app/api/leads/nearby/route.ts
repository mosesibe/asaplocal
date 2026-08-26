import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { getLeadsNearBusiness } from "@asaplocal/core";

/**
 * Polled by the dashboard radar map (~every 10s) for a live "leads nearby"
 * view, and used by the mobile app's leads inbox — allowanceRemaining and
 * creditBalance are extra fields the radar map ignores, mirroring what the
 * /leads marketplace page computes alongside the same getLeadsNearBusiness()
 * call so the mobile screen doesn't need a second endpoint just for that.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true, subscription: true, leadCreditWallet: true },
  });
  if (!business) return NextResponse.json({ leads: [], allowanceRemaining: 0, creditBalance: 0 });

  const leads = await getLeadsNearBusiness(business.id, { limit: 20 });
  const allowanceRemaining = business.subscription ? business.subscription.monthlyLeadAllowance - business.subscription.leadAllowanceUsed : 0;
  const creditBalance = business.leadCreditWallet?.balance ?? 0;
  return NextResponse.json({ leads, allowanceRemaining, creditBalance });
}
