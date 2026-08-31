import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { getLeadConversionAnalytics } from "@asaplocal/core";

// JSON counterpart to /analytics (a server component that queries Prisma
// directly via getLeadConversionAnalytics) — no such route existed for
// mobile before.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const analytics = await getLeadConversionAnalytics(business.id);
  return NextResponse.json(analytics);
}
