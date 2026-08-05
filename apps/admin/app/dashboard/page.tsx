import { prisma } from "@asaplocal/db";
import { formatPence } from "@asaplocal/ui";
import { Wallet, TrendingUp, PoundSterling, Users } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { MetricCard } from "@/components/metric-card";
import { ListBreakdown } from "@/components/list-breakdown";
import { DonutStat } from "@/components/donut-stat";
import { RevenueChart } from "./revenue-chart";

const PLAN_PRICE_PENCE: Record<string, number> = { FREE: 0, PRO: 2900, PREMIUM: 7900, ENTERPRISE: 0 };

const LEAD_STATUS_COLOR: Record<string, string> = {
  NEW: "bg-sky-500",
  CONTACTED: "bg-amber-500",
  QUOTED: "bg-brand-500",
  WON: "bg-emerald-500",
  LOST: "bg-red-500",
};

const PLAN_COLOR: Record<string, string> = {
  FREE: "bg-muted-foreground",
  PRO: "bg-sky-500",
  PREMIUM: "bg-brand-500",
  ENTERPRISE: "bg-espresso-700",
};

export default async function FinancialDashboard() {
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 3600 * 1000);
  const sixtyDaysAgo = new Date(now - 60 * 24 * 3600 * 1000);

  const [subs, activeUsers, revenueLast30, revenuePrev30, canceledLast30, allLeadAccesses, payments] = await Promise.all([
    prisma.subscription.findMany({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED", createdAt: { gte: thirtyDaysAgo } }, _sum: { amountPence: true } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }, _sum: { amountPence: true } }),
    prisma.subscription.count({ where: { status: "CANCELED", updatedAt: { gte: thirtyDaysAgo } } }),
    prisma.leadAccess.groupBy({ by: ["status"], _count: true }),
    prisma.payment.findMany({ where: { status: "SUCCEEDED", createdAt: { gte: new Date(now - 180 * 24 * 3600 * 1000) } }, select: { amountPence: true, createdAt: true, type: true } }),
  ]);

  const mrrPence = subs.reduce((sum, s) => sum + (PLAN_PRICE_PENCE[s.plan] ?? 0), 0);
  const arrPence = mrrPence * 12;
  const churnRate = subs.length > 0 ? canceledLast30 / (subs.length + canceledLast30) : 0;
  const totalLeads = allLeadAccesses.reduce((s, x) => s + x._count, 0);
  const wonLeads = allLeadAccesses.find((x) => x.status === "WON")?._count ?? 0;
  const conversionRate = totalLeads > 0 ? wonLeads / totalLeads : 0;

  const revenueLast30Pence = revenueLast30._sum.amountPence ?? 0;
  const revenuePrev30Pence = revenuePrev30._sum.amountPence ?? 0;
  const revenueDelta =
    revenuePrev30Pence > 0 ? ((revenueLast30Pence - revenuePrev30Pence) / revenuePrev30Pence) * 100 : null;

  const monthlyRevenue = new Map<string, number>();
  for (const p of payments) {
    const key = p.createdAt.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + p.amountPence);
  }
  const chartData = Array.from(monthlyRevenue.entries()).map(([month, pence]) => ({ month, revenue: pence / 100 }));
  const revenueSparkline = chartData.map((d) => d.revenue);

  const leadStatusItems = allLeadAccesses
    .map((x) => ({ label: x.status, value: x._count, color: LEAD_STATUS_COLOR[x.status] ?? "bg-muted-foreground" }))
    .sort((a, b) => b.value - a.value);

  const planCounts = new Map<string, number>();
  for (const s of subs) planCounts.set(s.plan, (planCounts.get(s.plan) ?? 0) + 1);
  const planData = Array.from(planCounts.entries()).map(([plan, count]) => ({ plan, count }));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Platform financials</h1>
          <p className="mt-1 text-sm text-muted-foreground">Revenue, subscriptions, and lead marketplace health.</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Wallet size={20} />} accent="brand" label="MRR" value={formatPence(mrrPence)} />
        <StatCard icon={<TrendingUp size={20} />} accent="espresso" label="ARR" value={formatPence(arrPence)} />
        <StatCard
          icon={<PoundSterling size={20} />}
          accent="emerald"
          label="Revenue (30d)"
          value={formatPence(revenueLast30Pence)}
          sparkline={revenueSparkline}
          delta={revenueDelta !== null ? { direction: revenueDelta >= 0 ? "up" : "down", label: `${Math.abs(revenueDelta).toFixed(1)}%` } : undefined}
        />
        <StatCard icon={<Users size={20} />} accent="sky" label="Active users" value={activeUsers.toLocaleString()} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <MetricCard title="Lead status breakdown" subtitle="Every lead access ever issued, by current status." className="xl:col-span-2">
          <ListBreakdown items={leadStatusItems} />
        </MetricCard>
        <DonutStat
          title="Lead → won conversion"
          subtitle="Won leads vs. total leads sold."
          centerValue={`${(conversionRate * 100).toFixed(1)}%`}
          centerLabel="conversion"
          segments={[
            { label: "Won", value: wonLeads, color: "#10b981" },
            { label: "Other", value: totalLeads - wonLeads, color: "#e5e0da" },
          ]}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <MetricCard
          title="Revenue trend"
          subtitle="Successful payments over the last 6 months."
          className="xl:col-span-2"
          stats={[
            { label: "Revenue (30d)", value: formatPence(revenueLast30Pence), color: "bg-brand-500" },
            { label: "Active subscriptions", value: subs.length.toLocaleString(), color: "bg-sky-500" },
            { label: "Leads sold", value: totalLeads.toLocaleString(), color: "bg-emerald-500" },
          ]}
        >
          <div className="h-64 w-full">
            <RevenueChart data={chartData} />
          </div>
        </MetricCard>
        <MetricCard
          title="Subscription mix"
          subtitle="Active subscriptions by plan."
          stats={[
            { label: "Churn (30d)", value: `${(churnRate * 100).toFixed(1)}%`, color: "bg-red-500" },
            { label: "Total active", value: subs.length.toLocaleString(), color: "bg-brand-500" },
          ]}
        >
          <ListBreakdown
            items={planData.map((p) => ({ label: p.plan, value: p.count, color: PLAN_COLOR[p.plan] ?? "bg-brand-500" }))}
          />
        </MetricCard>
      </div>
    </div>
  );
}
