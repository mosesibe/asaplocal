import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { withdrawAvailableBalance, computeProviderBalance } from "@asaplocal/core";

/** Sends a chosen amount (up to the provider's available balance) to their connected account. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });
  if (!business.stripeAccountId || !business.payoutsEnabled) {
    return NextResponse.json({ message: "Connect your bank account first" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const amountPence = Number(body.amountPence);
  if (!Number.isFinite(amountPence) || !Number.isInteger(amountPence) || amountPence <= 0) {
    return NextResponse.json({ message: "Enter a valid amount" }, { status: 400 });
  }

  const before = await computeProviderBalance(business.id);
  if (before.availablePence <= 0) return NextResponse.json({ message: "Nothing to withdraw" }, { status: 400 });
  if (amountPence > before.availablePence) {
    return NextResponse.json({ message: "You can't withdraw more than your available balance" }, { status: 400 });
  }

  const result = await withdrawAvailableBalance(business.id, amountPence);
  if (!result.ok) return NextResponse.json({ message: result.reason }, { status: 502 });
  return NextResponse.json(result);
}
