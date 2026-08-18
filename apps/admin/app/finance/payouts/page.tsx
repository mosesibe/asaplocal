import { Prisma, prisma } from "@asaplocal/db";
import { Badge, formatPence } from "@asaplocal/ui";
import { Wallet, Banknote, Scale } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { ListToolbar } from "@/components/list-toolbar";
import { Pagination } from "@/components/pagination";
import { PayoutsTabs } from "./payouts-tabs";
import { RecordPayoutForm } from "./record-payout-form";

const PAGE_SIZE = 20;

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.BusinessWhereInput = q ? { name: { contains: q, mode: "insensitive" } } : {};

  const [businesses, totalCount, earnedByBusiness, paidOutByBusiness, jobsByBusiness, allBusinessesForForm] = await Promise.all([
    prisma.business.findMany({
      where,
      include: { services: { take: 1, include: { category: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.business.count({ where }),
    // What providers are actually owed is the settled net (gross minus
    // commission), not everything collected — summing payments would overstate
    // every balance by the platform's fee.
    prisma.booking.groupBy({
      by: ["businessId"],
      where: { settledAt: { not: null } },
      _sum: { providerNetPence: true },
    }),
    prisma.payout.groupBy({ by: ["businessId"], _sum: { amountPence: true } }),
    prisma.booking.groupBy({ by: ["businessId"], where: { status: "COMPLETED" }, _count: true }),
    prisma.business.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const earnedMap = new Map(earnedByBusiness.map((r) => [r.businessId as string, r._sum.providerNetPence ?? 0]));
  const paidOutMap = new Map(paidOutByBusiness.map((r) => [r.businessId, r._sum.amountPence ?? 0]));
  const jobsMap = new Map(jobsByBusiness.map((r) => [r.businessId, r._count]));

  const totalEarnedPence = [...earnedMap.values()].reduce((s, v) => s + v, 0);
  const totalPaidOutPence = [...paidOutMap.values()].reduce((s, v) => s + v, 0);
  const outstandingPence = totalEarnedPence - totalPaidOutPence;

  const rows = businesses.map((b) => {
    const earned = earnedMap.get(b.id) ?? 0;
    const paidOut = paidOutMap.get(b.id) ?? 0;
    return {
      id: b.id,
      name: b.name,
      service: b.services[0]?.category.name ?? "—",
      postcode: b.postcode ?? "—",
      bankConnected: b.payoutsEnabled,
      jobs: jobsMap.get(b.id) ?? 0,
      earnedPence: earned,
      paidOutPence: paidOut,
      balancePence: earned - paidOut,
    };
  });

  const formBusinesses = allBusinessesForForm.map((b) => {
    const earned = earnedMap.get(b.id) ?? 0;
    const paidOut = paidOutMap.get(b.id) ?? 0;
    return { id: b.id, name: b.name, balancePence: earned - paidOut };
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Payouts</h1>
      <p className="mt-1 text-sm text-muted-foreground">What providers have earned and what's been paid out to them.</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={<Wallet size={20} />} accent="brand" label="Total earned (all providers)" value={formatPence(totalEarnedPence)} />
        <StatCard icon={<Banknote size={20} />} accent="emerald" label="Total payout" value={formatPence(totalPaidOutPence)} />
        <StatCard icon={<Scale size={20} />} accent="amber" label="Outstanding balance" value={formatPence(outstandingPence)} />
      </div>

      <PayoutsTabs
        summary={
          <div>
            <ListToolbar basePath="/finance/payouts" q={q} searchPlaceholder="Search by provider name…" />
            <div className="mt-4 overflow-x-auto rounded-none border border-border">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Postcode</th>
                    <th className="px-4 py-3">Bank</th>
                    <th className="px-4 py-3">Jobs</th>
                    <th className="px-4 py-3">Earned</th>
                    <th className="px-4 py-3">Paid out</th>
                    <th className="px-4 py-3">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{r.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{r.service}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{r.postcode}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge variant={r.bankConnected ? "success" : "outline"}>{r.bankConnected ? "Connected" : "Not connected"}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{r.jobs}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{formatPence(r.earnedPence)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatPence(r.paidOutPence)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{formatPence(r.balancePence)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No providers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Pagination page={page} totalPages={totalPages} totalCount={totalCount} basePath="/finance/payouts" searchParams={{ q }} />
            </div>
          </div>
        }
        record={<RecordPayoutForm businesses={formBusinesses} />}
      />
    </div>
  );
}
