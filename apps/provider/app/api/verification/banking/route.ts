import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { computeProviderBalance } from "@asaplocal/core";

// JSON counterpart to /verification/banking (a server component that
// queries Prisma directly) — needed so the mobile app can read Connect
// status and balance without a server component to fetch it in.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const balance = await computeProviderBalance(business.id);

  return NextResponse.json({
    payoutsEnabled: business.payoutsEnabled,
    stripeAccountId: !!business.stripeAccountId,
    balance,
  });
}
