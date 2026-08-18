import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { sweepOutstandingPayouts, computeProviderBalance } from "@asaplocal/core";

/** Releases any settled-but-untransferred earnings to the provider's connected account. */
export async function POST() {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });
  if (!business.stripeAccountId || !business.payoutsEnabled) {
    return NextResponse.json({ message: "Connect your bank account first" }, { status: 400 });
  }

  const before = await computeProviderBalance(business.id);
  if (before.availablePence <= 0) return NextResponse.json({ message: "Nothing to withdraw" }, { status: 400 });

  const result = await sweepOutstandingPayouts(business.id);
  if (result.bookingsPaid === 0) {
    return NextResponse.json({ message: "Couldn't send your payout — please try again shortly." }, { status: 502 });
  }
  return NextResponse.json(result);
}
