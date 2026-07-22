import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { getLeadConversionAnalytics } from "@asaplocal/core";
import { formatPence } from "@asaplocal/ui";
import { DashboardStat } from "@/components/dashboard-stat";
import { ConversionFunnelChart } from "./conversion-funnel-chart";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) redirect("/onboarding");

  const analytics = await getLeadConversionAnalytics(business.id);

  return (
    <div>
      <h1 className="text-2xl font-bold">Lead conversion analytics</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashboardStat label="Total leads acquired" value={analytics.total.toString()} />
        <DashboardStat label="Conversion rate" value={`${Math.round(analytics.conversionRate * 100)}%`} />
        <DashboardStat label="Total spend" value={formatPence(analytics.totalSpendPence)} />
        <DashboardStat label="Est. ROI" value={analytics.roi !== null ? `${Math.round(analytics.roi * 100)}%` : "—"} />
      </div>
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Funnel</h2>
        <ConversionFunnelChart byStatus={analytics.byStatus} />
      </div>
      {analytics.avgTimeToContactMins !== null && (
        <p className="mt-4 text-sm text-muted-foreground">Average time to first contact: {analytics.avgTimeToContactMins} minutes</p>
      )}
    </div>
  );
}
