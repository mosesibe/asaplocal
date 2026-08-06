import { Prisma, prisma } from "@asaplocal/db";
import { Badge, formatPence } from "@asaplocal/ui";
import { ListToolbar } from "@/components/list-toolbar";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { Pagination } from "@/components/pagination";
import { NewSubscriptionDialog } from "./new-subscription-dialog";

const PAGE_SIZE = 20;
const PLAN_PRICE_PENCE: Record<string, number> = { FREE: 0, PRO: 2900, PREMIUM: 7900, ENTERPRISE: 0 };
const STATUS_OPTIONS = ["ACTIVE", "TRIALING", "PAST_DUE", "CANCELED", "INCOMPLETE", "UNPAID"] as const;

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const statusFilter = status && (STATUS_OPTIONS as readonly string[]).includes(status) ? status : undefined;

  const where: Prisma.SubscriptionWhereInput = {
    ...(q ? { business: { name: { contains: q, mode: "insensitive" } } } : {}),
    ...(statusFilter ? { status: statusFilter as (typeof STATUS_OPTIONS)[number] } : {}),
  };

  const [subs, totalCount, businessesWithoutSub] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: { business: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.subscription.count({ where }),
    prisma.business.findMany({ where: { subscription: null }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 300 }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-2xl font-bold">Subscriptions</h1>
      <p className="mt-1 text-sm text-muted-foreground">Provider subscription plans and billing status.</p>

      <ListToolbar
        basePath="/finance/subscriptions"
        q={q}
        searchPlaceholder="Search by business name…"
        filters={
          <AutoSubmitSelect name="status" defaultValue={statusFilter ?? ""} className="h-10 w-auto">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </AutoSubmitSelect>
        }
        addNew={<NewSubscriptionDialog businesses={businessesWithoutSub} />}
      />

      <div className="mt-4 overflow-x-auto rounded-none border border-border">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Leads used</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subs.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="whitespace-nowrap px-4 py-3 font-medium">{s.business.name}</td>
                <td className="whitespace-nowrap px-4 py-3"><Badge variant="outline">{s.plan}</Badge></td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatPence(PLAN_PRICE_PENCE[s.plan] ?? 0)}/mo</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{s.leadAllowanceUsed}/{s.monthlyLeadAllowance}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Badge variant={s.status === "ACTIVE" ? "success" : s.status === "PAST_DUE" ? "warning" : "destructive"}>{s.status}</Badge>
                </td>
              </tr>
            ))}
            {subs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No subscriptions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} basePath="/finance/subscriptions" searchParams={{ q, status: statusFilter }} />
      </div>
    </div>
  );
}
