import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { computeProviderBalance } from "@asaplocal/core";

// JSON counterpart to /earnings/invoices (a server component that queries
// Prisma directly) — needed for the mobile app's Invoices & payouts screen,
// which has no server component to fetch this in.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const [settled, payouts, balance] = await Promise.all([
    prisma.booking.findMany({
      where: { businessId: business.id, settledAt: { not: null } },
      orderBy: { settledAt: "desc" },
      include: { jobRequest: true, customer: { include: { profile: true } }, payouts: true },
    }),
    prisma.payout.findMany({ where: { businessId: business.id }, orderBy: { paidAt: "desc" }, take: 20 }),
    computeProviderBalance(business.id),
  ]);

  return NextResponse.json({
    balance,
    jobs: settled.map((b) => {
      const grossPence = (b.providerNetPence ?? 0) + (b.platformFeePence ?? 0);
      return {
        id: b.id,
        title: b.jobRequest?.title ?? "Booking",
        customerName: [b.customer.profile?.firstName, b.customer.profile?.lastName].filter(Boolean).join(" ") || "Customer",
        settledAt: b.settledAt,
        grossPence,
        commissionPence: b.platformFeePence ?? 0,
        netPence: b.providerNetPence ?? 0,
        paidOut: b.payouts.length > 0,
      };
    }),
    payouts: payouts.map((p) => ({
      id: p.id,
      reference: p.reference,
      paidAt: p.paidAt,
      method: p.method,
      amountPence: p.amountPence,
    })),
  });
}
