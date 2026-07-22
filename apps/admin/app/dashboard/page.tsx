import { prisma } from "@asaplocal/db";
import { Card, formatPence } from "@asaplocal/ui";
import { RevenueChart } from "./revenue-chart";

const PLAN_PRICE_PENCE: Record<string, number> = { FREE: 0, PRO: 2900, PREMIUM: 7900, ENTERPRISE: 0 };

export default async function FinancialDashboard() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [subs, activeUsers, revenueLast30, canceledLast30, allLeadAccesses, payments] = await Promise.all([
    prisma.subscription.findMany({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED", createdAt: { gte: thirtyDaysAgo } }, _sum: { amountPence: true } }),
    prisma.subscription.count({ where: { status: "CANCELED", updatedAt: { gte: thirtyDaysAgo } } }),
    prisma.leadAccess.groupBy({ by: ["status"], _count: true }),
    prisma.payment.findMany({ where: { status: "SUCCEEDED", createdAt: { gte: new Date(Date.now() - 180 * 24 * 3600 * 1000) } }, select: { amountPence: true, createdAt: true, type: true } }),
  ]);

  const mrrPence = subs.reduce((sum, s) => sum + (PLAN_PRICE_PENCE[s.plan] ?? 0), 0);
  const arrPence = mrrPence * 12;
  const churnRate = subs.length > 0 ? canceledLast30 / (subs.length + canceledLast30) : 0;
  const totalLeads = allLeadAccesses.reduce((s, x) => s + x._count, 0);
  const wonLeads = allLeadAccesses.find((x) => x.status === "WON")?._count ?? 0;
  const conversionRate = totalLeads > 0 ? wonLeads / totalLeads : 0;

  const monthlyRevenue = new Map<string, number>();
  for (const p of payments) {
    const key = p.createdAt.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + p.amountPence);
  }
  const chartData = Array.from(monthlyRevenue.entries()).map(([month, pence]) => ({ month, revenue: pence / 100 }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Platform financials</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">MRR</p><p className="mt-1 text-xl font-bold">{formatPence(mrrPence)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">ARR</p><p className="mt-1 text-xl font-bold">{formatPence(arrPence)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Revenue (30d)</p><p className="mt-1 text-xl font-bold">{formatPence(revenueLast30._sum.amountPence ?? 0)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Active users</p><p className="mt-1 text-xl font-bold">{activeUsers}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Churn (30d)</p><p className="mt-1 text-xl font-bold">{(churnRate * 100).toFixed(1)}%</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Lead → won conversion</p><p className="mt-1 text-xl font-bold">{(conversionRate * 100).toFixed(1)}%</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Active subscriptions</p><p className="mt-1 text-xl font-bold">{subs.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total leads sold</p><p className="mt-1 text-xl font-bold">{totalLeads}</p></Card>
      </div>
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Revenue trend</h2>
        <RevenueChart data={chartData} />
      </div>
    </div>
  );
}
