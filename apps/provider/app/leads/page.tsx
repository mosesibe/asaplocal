import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { getLeadsNearBusiness } from "@asaplocal/core";
import { Badge, Card, formatPence } from "@asaplocal/ui";
import { AcquireLeadButtons } from "./acquire-lead-buttons";

export const metadata = { title: "Lead marketplace" };

export default async function LeadsMarketplacePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { subscription: true, leadCreditWallet: true },
  });
  if (!business) redirect("/onboarding");

  const leads = await getLeadsNearBusiness(business.id);

  const allowanceRemaining = business.subscription ? business.subscription.monthlyLeadAllowance - business.subscription.leadAllowanceUsed : 0;
  const creditBalance = business.leadCreditWallet?.balance ?? 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lead marketplace</h1>
        <p className="text-sm text-muted-foreground">
          {allowanceRemaining > 0 ? `${allowanceRemaining} plan leads left this month` : "No plan allowance left"} · {creditBalance} credits
        </p>
      </div>
      <div className="space-y-4">
        {leads.map((l) => (
          <Card key={l.id} className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{l.title}</p>
                  <Badge variant="outline">{l.categoryName}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{l.city} · {l.distanceMiles.toFixed(1)} mi away</p>
                {l.alreadyAcquired ? (
                  <p className="mt-2 max-w-xl text-sm">{l.description}</p>
                ) : (
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">{l.description.slice(0, 90)}… <span className="italic">(full details after purchase)</span></p>
                )}
                <p className="mt-2 text-sm text-muted-foreground">
                  Budget: {l.budgetMinPence ? formatPence(l.budgetMinPence) : "?"}–{l.budgetMaxPence ? formatPence(l.budgetMaxPence) : "?"} ·{" "}
                  {l.salesCount}/{l.maxLeadSales} providers have this lead
                </p>
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="text-lg font-bold text-brand-700">{formatPence(l.leadPricePence)}</p>
                {l.alreadyAcquired ? (
                  <Badge variant="success">Acquired</Badge>
                ) : (
                  <AcquireLeadButtons leadId={l.id} pricePence={l.leadPricePence} hasAllowance={allowanceRemaining > 0} hasCredits={creditBalance > 0} />
                )}
              </div>
            </div>
          </Card>
        ))}
        {leads.length === 0 && <p className="text-muted-foreground">No open leads in your category/area right now — check back soon.</p>}
      </div>
    </div>
  );
}
