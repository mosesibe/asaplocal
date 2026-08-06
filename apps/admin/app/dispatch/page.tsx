import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { Prisma, prisma } from "@asaplocal/db";
import { DispatchTabs } from "./dispatch-tabs";
import { ViewToggle } from "./view-toggle";
import { DispatchFilters } from "./dispatch-filters";
import { JobList } from "./job-list";
import { JobBoard } from "./job-board";
import { ServiceLog } from "./service-log";
import { BOARD_COLUMNS, jobInclude, tabWhere, type DispatchTab } from "./lib";

const PAGE_SIZE = 20;
const BOARD_COLUMN_CAP = 30;

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; view?: string; q?: string; region?: string; subStatus?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tab: tabParam, view: viewParam, q, region, subStatus, page: pageParam } = await searchParams;
  const tab: DispatchTab = (["new", "active", "completed", "paid", "archive", "log"] as const).includes(tabParam as DispatchTab)
    ? (tabParam as DispatchTab)
    : "new";
  const view = viewParam === "board" ? "board" : "list";
  const page = Math.max(1, Number(pageParam) || 1);
  const isAdmin = session.user.role === "ADMIN";

  const [regionRows, businesses] = await Promise.all([
    prisma.jobRequest.findMany({ distinct: ["city"], select: { city: true }, orderBy: { city: "asc" }, take: 200 }),
    prisma.business.findMany({ where: { verificationStatus: { in: ["VERIFIED", "PENDING"] } }, select: { id: true, name: true, city: true } }),
  ]);
  const regions = regionRows.map((r) => r.city).filter(Boolean);

  const searchWhere: Prisma.JobRequestWhereInput | undefined = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { postcode: { contains: q, mode: "insensitive" } },
          { customer: { phone: { contains: q, mode: "insensitive" } } },
          { customer: { profile: { firstName: { contains: q, mode: "insensitive" } } } },
          { customer: { profile: { lastName: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : undefined;
  const regionWhere: Prisma.JobRequestWhereInput | undefined = region ? { city: region } : undefined;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dispatch center</h1>
        {tab !== "log" && <ViewToggle view={view} tab={tab} q={q} region={region} />}
      </div>

      <DispatchTabs activeTab={tab} view={view} q={q} region={region} />
      <DispatchFilters tab={tab} view={view} q={q} region={region} subStatus={subStatus} regions={regions} />

      {tab === "log" ? (
        <ServiceLog q={q} region={region} />
      ) : view === "board" ? (
        <BoardSection isAdmin={isAdmin} businesses={businesses} searchWhere={searchWhere} regionWhere={regionWhere} />
      ) : (
        <ListSection
          tab={tab}
          isAdmin={isAdmin}
          businesses={businesses}
          searchWhere={searchWhere}
          regionWhere={regionWhere}
          subStatus={subStatus}
          page={page}
          searchParams={{ tab, view, q, region, subStatus }}
        />
      )}
    </div>
  );
}

async function ListSection({
  tab,
  isAdmin,
  businesses,
  searchWhere,
  regionWhere,
  subStatus,
  page,
  searchParams,
}: {
  tab: DispatchTab;
  isAdmin: boolean;
  businesses: { id: string; name: string; city: string }[];
  searchWhere?: Prisma.JobRequestWhereInput;
  regionWhere?: Prisma.JobRequestWhereInput;
  subStatus?: string;
  page: number;
  searchParams: Record<string, string | undefined>;
}) {
  const where: Prisma.JobRequestWhereInput = {
    AND: [
      tabWhere(tab),
      ...(regionWhere ? [regionWhere] : []),
      ...(searchWhere ? [searchWhere] : []),
      ...(tab === "active" && subStatus ? [{ status: subStatus as Prisma.EnumJobRequestStatusFilter["equals"] }] : []),
    ],
  };

  const [jobs, totalCount] = await Promise.all([
    prisma.jobRequest.findMany({
      where,
      include: jobInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.jobRequest.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <JobList jobs={jobs} page={page} totalPages={totalPages} totalCount={totalCount} isAdmin={isAdmin} businesses={businesses} searchParams={searchParams} />
  );
}

async function BoardSection({
  isAdmin,
  businesses,
  searchWhere,
  regionWhere,
}: {
  isAdmin: boolean;
  businesses: { id: string; name: string; city: string }[];
  searchWhere?: Prisma.JobRequestWhereInput;
  regionWhere?: Prisma.JobRequestWhereInput;
}) {
  const columns = await Promise.all(
    BOARD_COLUMNS.map(async (col) => {
      const where: Prisma.JobRequestWhereInput = {
        AND: [tabWhere(col.id), ...(regionWhere ? [regionWhere] : []), ...(searchWhere ? [searchWhere] : [])],
      };
      const [jobs, total] = await Promise.all([
        prisma.jobRequest.findMany({ where, include: jobInclude, orderBy: { createdAt: "desc" }, take: BOARD_COLUMN_CAP }),
        prisma.jobRequest.count({ where }),
      ]);
      return { id: col.id, label: col.label, jobs, total };
    })
  );

  return <JobBoard columns={columns} isAdmin={isAdmin} businesses={businesses} />;
}
