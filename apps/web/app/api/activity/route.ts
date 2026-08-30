import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { computeBookingBalance } from "@asaplocal/core";

// JSON counterpart to /activity (a server component that queries Prisma
// directly) — mobile previously only had GET /api/jobs (job requests only),
// missing the bookings and payments sections web shows on the same page.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const [jobRequests, bookings, payments] = await Promise.all([
    prisma.jobRequest.findMany({ where: { customerId: session.user.id }, include: { category: true, quotes: { select: { id: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.booking.findMany({ where: { customerId: session.user.id }, include: { business: true, payments: true, variations: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.payment.findMany({ where: { userId: session.user.id, status: "SUCCEEDED" }, include: { business: true }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return NextResponse.json({
    jobRequests: jobRequests.map((j) => ({
      id: j.id,
      title: j.title,
      categoryName: j.category.name,
      addressLine: j.addressLine,
      city: j.city,
      postcode: j.postcode,
      status: j.status,
      quoteCount: j.quotes.length,
      budgetMinPence: j.budgetMinPence,
      budgetMaxPence: j.budgetMaxPence,
      preferredDate: j.preferredDate,
      flexibleDate: j.flexibleDate,
      createdAt: j.createdAt,
    })),
    bookings: bookings.map((b) => ({
      id: b.id,
      businessName: b.business.name,
      totalAmountPence: b.totalAmountPence,
      scheduledDate: b.scheduledDate,
      status: b.status,
      depositDuePence: b.status === "PENDING" ? computeBookingBalance(b).depositDuePence : 0,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      bookingId: p.bookingId,
      businessName: p.business?.name ?? null,
      type: p.type,
      amountPence: p.amountPence,
      createdAt: p.createdAt,
    })),
  });
}
