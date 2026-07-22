import { prisma } from "@asaplocal/db";
import { Badge, Card, formatPence } from "@asaplocal/ui";

const PLAN_PRICE_PENCE: Record<string, number> = { FREE: 0, PRO: 2900, PREMIUM: 7900, ENTERPRISE: 0 };

export default async function SubscriptionsPage() {
  const subs = await prisma.subscription.findMany({ include: { business: true }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-bold">Subscriptions</h1>
      <div className="mt-6 space-y-2">
        {subs.map((s) => (
          <Card key={s.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{s.business.name}</p>
              <p className="text-xs text-muted-foreground">{s.leadAllowanceUsed}/{s.monthlyLeadAllowance} leads used this period · {formatPence(PLAN_PRICE_PENCE[s.plan] ?? 0)}/mo</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{s.plan}</Badge>
              <Badge variant={s.status === "ACTIVE" ? "success" : s.status === "PAST_DUE" ? "warning" : "destructive"}>{s.status}</Badge>
            </div>
          </Card>
        ))}
        {subs.length === 0 && <p className="text-sm text-muted-foreground">No subscriptions yet.</p>}
      </div>
    </div>
  );
}
