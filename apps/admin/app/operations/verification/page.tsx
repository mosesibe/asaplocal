import Link from "next/link";
import { Prisma, prisma, type VerificationStatus } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { ListToolbar } from "@/components/list-toolbar";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = ["PENDING", "MORE_INFO_REQUESTED", "VERIFIED", "REJECTED", "UNVERIFIED"] as const;

export default async function VerificationQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const statusFilter: VerificationStatus | undefined =
    status && (STATUS_OPTIONS as readonly string[]).includes(status) ? (status as VerificationStatus) : undefined;

  const where: Prisma.BusinessWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(statusFilter
      ? { verificationStatus: statusFilter }
      : {
          OR: [
            { verificationStatus: { in: ["PENDING", "MORE_INFO_REQUESTED"] } },
            { identityVerification: { status: { in: ["PENDING", "MORE_INFO_REQUESTED"] } } },
            { insurancePolicies: { some: { status: { in: ["PENDING", "MORE_INFO_REQUESTED"] } } } },
            { qualifications: { some: { status: { in: ["PENDING", "MORE_INFO_REQUESTED"] } } } },
          ],
        }),
  };

  const [businesses, totalCount] = await Promise.all([
    prisma.business.findMany({
      where,
      include: { identityVerification: true, insurancePolicies: true, qualifications: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.business.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-2xl font-bold">Verification queue</h1>
      <p className="mt-1 text-muted-foreground">
        {statusFilter ? `Businesses with verification status ${statusFilter}.` : "Businesses with at least one phase awaiting review."}
      </p>

      <ListToolbar
        basePath="/operations/verification"
        q={q}
        searchPlaceholder="Search by business name…"
        filters={
          <AutoSubmitSelect name="status" defaultValue={statusFilter ?? ""} className="h-10 w-auto">
            <option value="">Pending review (default)</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </AutoSubmitSelect>
        }
      />

      <div className="mt-4 space-y-2">
        {businesses.map((b) => {
          const pendingPhases = [
            ["PENDING", "MORE_INFO_REQUESTED"].includes(b.verificationStatus) && "Business",
            b.identityVerification && ["PENDING", "MORE_INFO_REQUESTED"].includes(b.identityVerification.status) && "Identity",
            b.insurancePolicies.some((p) => ["PENDING", "MORE_INFO_REQUESTED"].includes(p.status)) && "Insurance",
            b.qualifications.some((q) => ["PENDING", "MORE_INFO_REQUESTED"].includes(q.status)) && "Qualifications",
          ].filter(Boolean) as string[];

          return (
            <Link key={b.id} href={`/operations/verification/${b.id}`}>
              <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-card">
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.city} · Trust tier: {b.trustTier}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {pendingPhases.length > 0
                    ? pendingPhases.map((phase) => <Badge key={phase} variant="warning">{phase}</Badge>)
                    : <Badge variant="outline">{b.verificationStatus}</Badge>}
                </div>
              </Card>
            </Link>
          );
        })}
        {businesses.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
      </div>

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} basePath="/operations/verification" searchParams={{ q, status: statusFilter }} />
      </div>
    </div>
  );
}
