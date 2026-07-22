import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { milesBetween } from "@asaplocal/core";
import { Badge, Card, formatPence } from "@asaplocal/ui";
import { AcquireLeadButtons } from "./acquire-lead-buttons";

export const metadata = { title: "Lead marketplace" };

export default async function LeadsMarketplacePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { serviceAreas: true, services: { select: { categoryId: true } }, subscription: true, leadCreditWallet: true },
  });
  if (!business) redirect("/onboarding");

  const categoryIds = [...new Set(business.services.map((s) => s.categoryId))];

  const candidateLeads = await prisma.lead.findMany({
    where: {
      status: { in: ["AVAILABLE"] },
      jobRequest: { categoryId: { in: categoryIds }, status: { in: ["OPEN", "MATCHING", "QUOTED"] } },
    },
    include: { jobRequest: { include: { category: true } }, accesses: { where: { businessId: business.id } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const radius = business.serviceAreas[0]?.radiusMiles ?? business.baseRadiusMiles;
  const leads = candidateLeads.filter(
    (l) => milesBetween(Number(business.lat), Number(business.lng), Number(l.jobRequest.lat), Number(l.jobRequest.lng)) <= radius
  );

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
        {leads.map((l) => {
          const alreadyAcquired = l.accesses.length > 0;
          const distance = milesBetween(Number(business.lat), Number(business.lng), Number(l.jobRequest.lat), Number(l.jobRequest.lng));
          return (
            <Card key={l.id} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{l.jobRequest.title}</p>
                    <Badge variant="outline">{l.jobRequest.category.name}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{l.jobRequest.city} · {distance.toFixed(1)} mi away</p>
                  {alreadyAcquired ? (
                    <p className="mt-2 max-w-xl text-sm">{l.jobRequest.description}</p>
                  ) : (
                    <p className="mt-2 max-w-xl text-sm text-muted-foreground">{l.jobRequest.description.slice(0, 90)}… <span className="italic">(full details after purchase)</span></p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    Budget: {l.jobRequest.budgetMinPence ? formatPence(l.jobRequest.budgetMinPence) : "?"}–{l.jobRequest.budgetMaxPence ? formatPence(l.jobRequest.budgetMaxPence) : "?"} ·{" "}
                    {l.salesCount}/{l.jobRequest.maxLeadSales} providers have this lead
                  </p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="text-lg font-bold text-brand-700">{formatPence(l.jobRequest.leadPricePence)}</p>
                  {alreadyAcquired ? (
                    <Badge variant="success">Acquired</Badge>
                  ) : (
                    <AcquireLeadButtons leadId={l.id} pricePence={l.jobRequest.leadPricePence} hasAllowance={allowanceRemaining > 0} hasCredits={creditBalance > 0} />
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {leads.length === 0 && <p className="text-muted-foreground">No open leads in your category/area right now — check back soon.</p>}
      </div>
    </div>
  );
}
