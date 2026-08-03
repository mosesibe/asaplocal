import Link from "next/link";
import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";

export default async function VerificationQueuePage() {
  const businesses = await prisma.business.findMany({
    where: {
      OR: [
        { verificationStatus: { in: ["PENDING", "MORE_INFO_REQUESTED"] } },
        { identityVerification: { status: { in: ["PENDING", "MORE_INFO_REQUESTED"] } } },
        { insurancePolicies: { some: { status: { in: ["PENDING", "MORE_INFO_REQUESTED"] } } } },
        { qualifications: { some: { status: { in: ["PENDING", "MORE_INFO_REQUESTED"] } } } },
      ],
    },
    include: { identityVerification: true, insurancePolicies: true, qualifications: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Verification queue</h1>
      <p className="mt-1 text-muted-foreground">Businesses with at least one phase awaiting review.</p>
      <div className="mt-6 space-y-2">
        {businesses.map((b) => {
          const pendingPhases = [
            ["PENDING", "MORE_INFO_REQUESTED"].includes(b.verificationStatus) && "Business",
            b.identityVerification && ["PENDING", "MORE_INFO_REQUESTED"].includes(b.identityVerification.status) && "Identity",
            b.insurancePolicies.some((p) => ["PENDING", "MORE_INFO_REQUESTED"].includes(p.status)) && "Insurance",
            b.qualifications.some((q) => ["PENDING", "MORE_INFO_REQUESTED"].includes(q.status)) && "Qualifications",
          ].filter(Boolean) as string[];

          return (
            <Link key={b.id} href={`/verification/${b.id}`}>
              <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-card">
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.city} · Trust tier: {b.trustTier}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {pendingPhases.map((phase) => (
                    <Badge key={phase} variant="warning">{phase}</Badge>
                  ))}
                </div>
              </Card>
            </Link>
          );
        })}
        {businesses.length === 0 && <p className="text-sm text-muted-foreground">Nothing pending review.</p>}
      </div>
    </div>
  );
}
