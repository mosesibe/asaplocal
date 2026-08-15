import Link from "next/link";
import { Prisma, prisma, type JobRequestStatus } from "@asaplocal/db";
import { Badge, formatPence } from "@asaplocal/ui";
import { ListToolbar } from "@/components/list-toolbar";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 25;

const STATUS_OPTIONS = ["OPEN", "MATCHING", "QUOTED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED"] as const;

const STATUS_VARIANT: Record<string, "success" | "destructive" | "outline" | "warning" | "secondary"> = {
  OPEN: "outline",
  MATCHING: "outline",
  QUOTED: "secondary",
  ASSIGNED: "warning",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
  EXPIRED: "destructive",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function JobsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const statusFilter: JobRequestStatus | undefined =
    status && (STATUS_OPTIONS as readonly string[]).includes(status) ? (status as JobRequestStatus) : undefined;

  const where: Prisma.JobRequestWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { customer: { profile: { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }] } } },
          ],
        }
      : {}),
  };

  const [jobs, totalCount] = await Promise.all([
    prisma.jobRequest.findMany({
      where,
      include: {
        category: true,
        customer: { include: { profile: true } },
        booking: { include: { business: true } },
        _count: { select: { quotes: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.jobRequest.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-2xl font-bold">Jobs</h1>
      <p className="mt-1 text-muted-foreground">Every job request posted on the platform.</p>

      <ListToolbar
        basePath="/operations/jobs"
        q={q}
        searchPlaceholder="Search by title, city or customer…"
        filters={
          <AutoSubmitSelect name="status" defaultValue={statusFilter ?? ""} className="h-10 w-auto">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </AutoSubmitSelect>
        }
      />

      <div className="mt-4 overflow-x-auto rounded-none border border-border">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Quotes</th>
              <th className="px-4 py-3">Booked with</th>
              <th className="px-4 py-3">Posted</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.map((job) => {
              const customerName = job.customer.profile ? `${job.customer.profile.firstName} ${job.customer.profile.lastName}` : job.customer.email;
              const budget =
                job.budgetMinPence && job.budgetMaxPence
                  ? `${formatPence(job.budgetMinPence)}–${formatPence(job.budgetMaxPence)}`
                  : job.budgetMaxPence
                    ? `Up to ${formatPence(job.budgetMaxPence)}`
                    : "—";
              return (
                <tr key={job.id} className="hover:bg-muted/30">
                  <td className="max-w-[220px] px-4 py-3">
                    <Link href={`/operations/jobs/${job.id}`} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                      {job.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{customerName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{job.category.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{job.city}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{budget}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{job._count.quotes}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{job.booking?.business.name ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fmtDate(job.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge variant={STATUS_VARIANT[job.status] ?? "outline"}>{job.status.replace(/_/g, " ")}</Badge>
                  </td>
                </tr>
              );
            })}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No jobs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} basePath="/operations/jobs" searchParams={{ q, status: statusFilter }} />
      </div>
    </div>
  );
}
