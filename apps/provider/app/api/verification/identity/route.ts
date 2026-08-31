import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

// JSON counterpart to /verification/identity (a server component that
// queries Prisma directly) — needed so the mobile app can read identity
// verification status without a server component to fetch it in.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { identityVerification: true },
  });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const identity = business.identityVerification;

  return NextResponse.json({
    status: identity?.status ?? "UNVERIFIED",
    lastError: identity?.lastError ?? null,
  });
}
