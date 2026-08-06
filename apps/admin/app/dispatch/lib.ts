import { Prisma } from "@asaplocal/db";
import { milesBetween } from "@asaplocal/ui";

export type DispatchTab = "new" | "active" | "completed" | "paid" | "archive" | "log";

export const TABS: { id: DispatchTab; label: string }[] = [
  { id: "new", label: "New" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "paid", label: "Paid" },
  { id: "archive", label: "Archive" },
  { id: "log", label: "Service log" },
];

export const BOARD_COLUMNS: { id: "new" | "active" | "completed" | "archive"; label: string }[] = [
  { id: "new", label: "New" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "archive", label: "Cancelled" },
];

export const ACTIVE_SUB_STATUSES = ["MATCHING", "QUOTED", "ASSIGNED", "IN_PROGRESS"] as const;

export function tabWhere(tab: DispatchTab): Prisma.JobRequestWhereInput {
  switch (tab) {
    case "new":
      return { status: "OPEN" };
    case "active":
      return { status: { in: [...ACTIVE_SUB_STATUSES] } };
    case "completed":
      return { status: "COMPLETED", OR: [{ booking: null }, { booking: { payments: { none: { status: "SUCCEEDED" } } } }] };
    case "paid":
      return { status: "COMPLETED", booking: { payments: { some: { status: "SUCCEEDED" } } } };
    case "archive":
      return { status: { in: ["CANCELLED", "EXPIRED"] } };
    case "log":
      return {};
  }
}

export const jobInclude = {
  customer: { include: { profile: true } },
  category: true,
  lead: { include: { accesses: true } },
  booking: { include: { business: true, payments: true, service: { include: { category: true } } } },
  quotes: { where: { status: "ACCEPTED" as const }, include: { business: true }, take: 1 },
  dispatcherAssignments: { orderBy: { createdAt: "desc" as const }, take: 1, include: { assignedBusiness: true } },
} satisfies Prisma.JobRequestInclude;

export type DispatchJob = Prisma.JobRequestGetPayload<{ include: typeof jobInclude }>;

export function deriveJobView(job: DispatchJob) {
  const assignedBusiness = job.booking?.business ?? job.quotes[0]?.business ?? job.dispatcherAssignments[0]?.assignedBusiness ?? null;
  const expectedCostPence =
    job.booking?.totalAmountPence ?? job.quotes[0]?.amountPence ?? job.budgetMaxPence ?? job.budgetMinPence ?? job.leadPricePence;
  const distanceMiles = assignedBusiness
    ? milesBetween(Number(job.lat), Number(job.lng), Number(assignedBusiness.lat), Number(assignedBusiness.lng))
    : null;
  const scheduledDate = job.booking?.scheduledDate ?? job.preferredDate ?? null;
  const isPaid = job.booking?.payments.some((p) => p.status === "SUCCEEDED") ?? false;
  return { assignedBusiness, expectedCostPence, distanceMiles, scheduledDate, isPaid };
}
