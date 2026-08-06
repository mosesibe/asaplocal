import Link from "next/link";
import { Prisma, prisma, type VerificationStatus } from "@asaplocal/db";
import { Avatar, Badge, Card } from "@asaplocal/ui";
import { ListToolbar } from "@/components/list-toolbar";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = ["PENDING", "MORE_INFO_REQUESTED", "VERIFIED", "REJECTED"] as const;

function statusVariant(status: string) {
  if (status === "VERIFIED") return "success" as const;
  if (status === "REJECTED") return "destructive" as const;
  if (status === "PENDING" || status === "MORE_INFO_REQUESTED") return "warning" as const;
  return "outline" as const;
}

export default async function StaffQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const statusFilter: VerificationStatus | undefined =
    status && (STATUS_OPTIONS as readonly string[]).includes(status) ? (status as VerificationStatus) : undefined;

  const where: Prisma.StaffMemberWhereInput = {
    ...(q
      ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { business: { name: { contains: q, mode: "insensitive" } } }] }
      : {}),
    approvalStatus: statusFilter ?? { in: ["PENDING", "MORE_INFO_REQUESTED"] },
  };

  const [staff, totalCount] = await Promise.all([
    prisma.staffMember.findMany({
      where,
      include: { business: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.staffMember.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-2xl font-bold">Field staff approvals</h1>
      <p className="mt-1 text-muted-foreground">
        {statusFilter ? `Staff with status ${statusFilter}.` : "Company staff records awaiting review."}
      </p>

      <ListToolbar
        basePath="/operations/staff"
        q={q}
        searchPlaceholder="Search by staff or business name…"
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
        {staff.map((s) => (
          <Link key={s.id} href={`/operations/staff/${s.id}`}>
            <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-card">
              <div className="flex items-center gap-3">
                <Avatar src={s.profilePhotoUrl} name={s.fullName} size={40} />
                <div>
                  <p className="font-medium">{s.fullName}</p>
                  <p className="text-xs text-muted-foreground">{s.business.name}{s.jobTitle ? ` · ${s.jobTitle}` : ""}</p>
                </div>
              </div>
              <Badge variant={statusVariant(s.approvalStatus)}>{s.approvalStatus.replace(/_/g, " ")}</Badge>
            </Card>
          </Link>
        ))}
        {staff.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
      </div>

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} basePath="/operations/staff" searchParams={{ q, status: statusFilter }} />
      </div>
    </div>
  );
}
