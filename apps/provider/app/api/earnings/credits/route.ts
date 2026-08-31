import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

// JSON counterpart to /earnings/credits (a server component that queries
// Prisma directly) — needed for the mobile app's Lead credits screen, which
// has no server component to fetch this in.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { leadCreditWallet: { include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } } } },
  });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const wallet = business.leadCreditWallet;

  return NextResponse.json({
    balance: wallet?.balance ?? 0,
    transactions: (wallet?.transactions ?? []).map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      createdAt: t.createdAt,
    })),
  });
}
