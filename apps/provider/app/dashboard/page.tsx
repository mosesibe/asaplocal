import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { getLeadConversionAnalytics, getEarningsSummary } from "@asaplocal/core";
import { Badge, Card } from "@asaplocal/ui";
import { DashboardStat } from "@/components/dashboard-stat";
import { EarningsWidget } from "./earnings-widget";
import { WeekCalendarStrip } from "./week-calendar-strip";
import { RadarMap } from "./radar-map";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function ProviderDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { subscription: true, leadCreditWallet: true, serviceAreas: true },
  });
  if (!business) redirect("/onboarding");

  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [bookingsCount, recentLeads, analytics, earnings, weekBookings] = await Promise.all([
    prisma.booking.count({ where: { businessId: business.id } }),
    prisma.leadAccess.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" }, take: 5, include: { lead: { include: { jobRequest: true } } } }),
    getLeadConversionAnalytics(business.id),
    getEarningsSummary(business.id),
    prisma.booking.findMany({
      where: { businessId: business.id, scheduledDate: { gte: weekStart, lt: weekEnd } },
      select: { scheduledDate: true },
    }),
  ]);

  const bookingDates = weekBookings.map((b) => b.scheduledDate.toISOString().slice(0, 10));

  return (
    <div>
      <div className="space-y-4">
        <EarningsWidget earnings={earnings} />
        <WeekCalendarStrip bookingDates={bookingDates} />
        <RadarMap
          center={{ lat: Number(business.lat), lng: Number(business.lng) }}
          baseRadiusMiles={business.baseRadiusMiles}
          serviceAreas={business.serviceAreas.map((a) => ({ lat: Number(a.lat), lng: Number(a.lng), radiusMiles: a.radiusMiles }))}
        />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashboardStat label="Leads received" value={analytics.total.toString()} />
        <DashboardStat label="Bookings" value={bookingsCount.toString()} />
        <DashboardStat label="Lead conversion" value={`${Math.round(analytics.conversionRate * 100)}%`} />
        <DashboardStat label="Avg. rating" value={`${Number(business.avgRating).toFixed(1)} ★`} sub={`${business.reviewCount} reviews`} />
        <DashboardStat label="Profile views" value={business.profileViews.toString()} />
        <DashboardStat label="Plan" value={business.subscription?.plan ?? "FREE"} sub={<Link href="/billing" className="text-brand-700 hover:underline">Manage →</Link>} />
        <DashboardStat label="Lead credits" value={(business.leadCreditWallet?.balance ?? 0).toString()} sub={<Link href="/billing" className="text-brand-700 hover:underline">Top up →</Link>} />
      </div>

      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent leads</h2>
          <Link href="/leads" className="text-sm text-brand-700 hover:underline">View lead marketplace →</Link>
        </div>
        <div className="space-y-3">
          {recentLeads.map((l) => (
            <Link key={l.id} href={`/leads/${l.leadId}`}>
              <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{l.lead.jobRequest.title}</p>
                  <p className="text-xs text-muted-foreground">{l.lead.jobRequest.city} · {l.acquisitionType.replace("_", " ").toLowerCase()}</p>
                </div>
                <Badge variant="outline" className="w-fit">{l.status}</Badge>
              </Card>
            </Link>
          ))}
          {recentLeads.length === 0 && <p className="text-sm text-muted-foreground">No leads yet — check the marketplace for new jobs in your area.</p>}
        </div>
      </div>
    </div>
  );
}
