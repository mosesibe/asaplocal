import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { getLeadConversionAnalytics, getEarningsSummary } from "@asaplocal/core";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

// JSON counterpart to /dashboard (a server component that queries Prisma
// directly) — no such route existed for mobile before. Mirrors the same
// reads/derived stats as plain JSON. The RadarMap (business location +
// service-area circles) is intentionally omitted — a real map view needs a
// native maps dependency, out of scope for this pass; the stat grid and
// recent-leads list carry the functional value.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { subscription: true, leadCreditWallet: true },
  });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [bookingsCount, recentLeads, analytics, earnings, weekBookings] = await Promise.all([
    prisma.booking.count({ where: { businessId: business.id } }),
    prisma.leadAccess.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { lead: { include: { jobRequest: true } } },
    }),
    getLeadConversionAnalytics(business.id),
    getEarningsSummary(business.id),
    prisma.booking.findMany({
      where: { businessId: business.id, scheduledDate: { gte: weekStart, lt: weekEnd } },
      select: { scheduledDate: true },
    }),
  ]);

  return NextResponse.json({
    bookingsCount,
    avgRating: Number(business.avgRating),
    reviewCount: business.reviewCount,
    profileViews: business.profileViews,
    plan: business.subscription?.plan ?? "FREE",
    leadCreditBalance: business.leadCreditWallet?.balance ?? 0,
    analytics: { total: analytics.total, conversionRate: analytics.conversionRate },
    earnings: { weekTotalPence: earnings.weekTotalPence, allTimePence: earnings.allTimePence },
    weekBookingDates: weekBookings.map((b) => b.scheduledDate.toISOString().slice(0, 10)),
    recentLeads: recentLeads.map((l) => ({
      id: l.id,
      leadId: l.leadId,
      title: l.lead.jobRequest.title,
      city: l.lead.jobRequest.city,
      acquisitionType: l.acquisitionType,
      status: l.status,
    })),
  });
}
