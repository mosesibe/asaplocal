import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

// Called once the provider reaches the end of the post-signup wizard
// (business profile → services → verification) — marks the wizard itself
// as dismissed so /dashboard stops redirecting them back into it. Doesn't
// require verification to actually be complete: sections there stay
// reachable from the dashboard nav afterwards.
export async function POST() {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id }, select: { id: true, onboardingCompletedAt: true } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  if (!business.onboardingCompletedAt) {
    await prisma.business.update({ where: { id: business.id }, data: { onboardingCompletedAt: new Date() } });
  }

  return NextResponse.json({ ok: true });
}
