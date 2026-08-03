import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { createIdentityVerificationSession } from "@asaplocal/core";

export async function POST() {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const returnUrl = `${process.env.NEXT_PUBLIC_PROVIDER_URL}/verification/identity/return`;
  const vSession = await createIdentityVerificationSession(business.id, returnUrl);

  await prisma.identityVerification.upsert({
    where: { businessId: business.id },
    update: { status: "PENDING", stripeVerificationSessionId: vSession.id, lastError: null },
    create: { businessId: business.id, status: "PENDING", stripeVerificationSessionId: vSession.id },
  });

  return NextResponse.json({ url: vSession.url });
}
