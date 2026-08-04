import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { getLeadsNearBusiness } from "@asaplocal/core";

/** Polled by the dashboard radar map (~every 10s) for a live "leads nearby" view. */
export async function GET() {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id }, select: { id: true } });
  if (!business) return NextResponse.json({ leads: [] });

  const leads = await getLeadsNearBusiness(business.id, { limit: 20 });
  return NextResponse.json({ leads });
}
