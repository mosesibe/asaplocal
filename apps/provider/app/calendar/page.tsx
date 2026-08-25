import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { canHaveStaff } from "@asaplocal/core";
import { Badge, Card, cn, formatPence } from "@asaplocal/ui";
import { AssignStaffSelect } from "./assign-staff-select";
import { MonthGrid, STATUS_DOT, type CalendarDayJob, type CalendarSpanJob } from "./month-grid";
import { PageHeading } from "@/components/page-heading";

/** Local YYYY-MM-DD — never toISOString(), which would shift evening jobs a day back in BST. */
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_BADGE: Record<string, "success" | "destructive" | "outline" | "warning" | "secondary"> = {
  PENDING: "outline",
  CONFIRMED: "secondary",
  IN_PROGRESS: "warning",
  AWAITING_APPROVAL: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
  DISPUTED: "destructive",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const { month: monthParam, day: dayParam } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) redirect("/onboarding");

  const now = new Date();
  const parsed = /^\d{4}-\d{2}$/.test(monthParam ?? "") ? monthParam!.split("-").map(Number) : null;
  const year = parsed?.[0] ?? now.getFullYear();
  const month = parsed?.[1] ?? now.getMonth() + 1; // 1-12

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const prev = new Date(year, month - 2, 1);
  const next = new Date(year, month, 1);
  const fmtMonthParam = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const staffAssignable = canHaveStaff(business.businessType);

  const [monthBookings, spanningIntoMonth, upcoming, staffOptions] = await Promise.all([
    // Every status — a completed job is still part of the provider's record,
    // and hiding it made an active business look like it had no work at all.
    prisma.booking.findMany({
      where: { businessId: business.id, scheduledDate: { gte: monthStart, lt: monthEnd } },
      orderBy: { scheduledDate: "asc" },
      include: { customer: { include: { profile: true } }, assignedStaff: true, jobRequest: true },
    }),
    // A job that started in an earlier month and either finished during this
    // one, or hasn't finished yet, needs to be on this month's grid too — its
    // scheduledDate alone (matched above) wouldn't catch it.
    prisma.booking.findMany({
      where: {
        businessId: business.id,
        startedAt: { lt: monthStart },
        OR: [{ completedAt: { gte: monthStart } }, { completedAt: null }],
      },
      include: { customer: { include: { profile: true } }, assignedStaff: true, jobRequest: true },
    }),
    prisma.booking.findMany({
      where: { businessId: business.id, status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS", "AWAITING_APPROVAL", "DISPUTED"] }, scheduledDate: { gte: now } },
      orderBy: { scheduledDate: "asc" },
      take: 5,
      include: { customer: { include: { profile: true } }, assignedStaff: true, jobRequest: true },
    }),
    staffAssignable
      ? prisma.staffMember.findMany({ where: { businessId: business.id, approvalStatus: "VERIFIED", isActive: true } })
      : Promise.resolve([]),
  ]);

  // The calendar grid draws from both sets (a job can appear here without
  // affecting the "this month" stats/list below, which stay tied to
  // scheduledDate) — dedup in case a job qualifies for both.
  const gridBookings = [...monthBookings, ...spanningIntoMonth.filter((b) => !monthBookings.some((m) => m.id === b.id))];

  // A job only gets a multi-day ribbon once there's real elapsed time to draw
  // from (startedAt set) — a job that's merely scheduled has no known length.
  // Still-running jobs use "now" as a provisional end so the ribbon keeps
  // growing until it's actually finished.
  const jobsByDay = new Map<string, CalendarDayJob[]>();
  const multiDayJobs: CalendarSpanJob[] = [];
  for (const b of gridBookings) {
    const title = b.jobRequest?.title ?? "Booking";
    const start = b.startedAt ?? b.scheduledDate;
    const end = b.startedAt ? (b.completedAt ?? (b.status === "IN_PROGRESS" ? now : b.startedAt)) : b.scheduledDate;
    const startKey = dayKey(start);
    const endKey = dayKey(end);
    if (startKey === endKey) {
      jobsByDay.set(startKey, [...(jobsByDay.get(startKey) ?? []), { id: b.id, status: b.status, title }]);
    } else {
      multiDayJobs.push({ id: b.id, status: b.status, title, startKey, endKey });
    }
  }

  const completedThisMonth = monthBookings.filter((b) => b.status === "COMPLETED");
  const earnedThisMonth = monthBookings.reduce((sum, b) => sum + (b.settledAt ? (b.providerNetPence ?? 0) : 0), 0);

  const listed = dayParam ? monthBookings.filter((b) => dayKey(b.scheduledDate) === dayParam) : monthBookings;
  const monthLabel = monthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div>
      <PageHeading>Calendar</PageHeading>
      <p className="mt-1 text-sm text-muted-foreground">Every job you've booked, in progress and completed.</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Jobs this month</p>
          <p className="mt-0.5 text-xl font-bold">{monthBookings.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="mt-0.5 text-xl font-bold">{completedThisMonth.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Earned</p>
          <p className="mt-0.5 text-xl font-bold">{formatPence(earnedThisMonth)}</p>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <Link href={`/calendar?month=${fmtMonthParam(prev)}`} aria-label="Previous month" className="rounded-lg p-1.5 hover:bg-muted">
            <ChevronLeft size={18} />
          </Link>
          <div className="text-center">
            <p className="font-semibold">{monthLabel}</p>
            <Link href="/calendar" className="text-xs text-brand-700 hover:underline dark:text-brand-300">Today</Link>
          </div>
          <Link href={`/calendar?month=${fmtMonthParam(next)}`} aria-label="Next month" className="rounded-lg p-1.5 hover:bg-muted">
            <ChevronRight size={18} />
          </Link>
        </div>

        <MonthGrid year={year} month={month} jobsByDay={jobsByDay} multiDayJobs={multiDayJobs} selectedDay={dayParam} todayKey={dayKey(now)} />

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          {Object.entries(STATUS_DOT)
            .filter(([s]) => s !== "DISPUTED")
            .map(([status, dot]) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", dot)} />
                {status.replace(/_/g, " ").toLowerCase()}
              </span>
            ))}
        </div>
      </Card>

      {upcoming.length > 0 && !dayParam && (
        <div className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">Next up</h2>
          <div className="space-y-2">
            {upcoming.map((b) => (
              <Link key={b.id} href={`/calendar/${b.id}`}>
                <Card className="flex items-center justify-between gap-3 p-3 transition-shadow hover:shadow-card">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{b.jobRequest?.title ?? "Booking"}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.scheduledDate.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Badge variant={STATUS_BADGE[b.status] ?? "outline"} className="shrink-0">{b.status.replace(/_/g, " ")}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {dayParam
              ? new Date(`${dayParam}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
              : monthLabel}
          </h2>
          {dayParam && (
            <Link href={`/calendar?month=${fmtMonthParam(monthStart)}`} className="text-sm text-brand-700 hover:underline dark:text-brand-300">
              Show whole month
            </Link>
          )}
        </div>

        <div className="space-y-3">
          {listed.map((b) => (
            <Card key={b.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{b.jobRequest?.title ?? "Booking"}</p>
                <p className="text-xs text-muted-foreground">
                  {b.customer.profile?.firstName} {b.customer.profile?.lastName} · {b.scheduledDate.toLocaleString("en-GB")}
                </p>
                <p className="truncate text-xs text-muted-foreground">{b.addressLine}, {b.city}</p>
                {b.settledAt && b.providerNetPence != null && (
                  <p className="mt-0.5 text-xs text-emerald-600">You earned {formatPence(b.providerNetPence)}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {staffAssignable && (b.status === "CONFIRMED" || b.status === "IN_PROGRESS") && (
                  <AssignStaffSelect bookingId={b.id} assignedStaffId={b.assignedStaffId} staffOptions={staffOptions} />
                )}
                <Link href={`/calendar/${b.id}`} className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
                  Open
                </Link>
                <Badge variant={STATUS_BADGE[b.status] ?? "outline"} className="w-fit">{b.status.replace(/_/g, " ")}</Badge>
              </div>
            </Card>
          ))}
          {listed.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {dayParam ? "Nothing scheduled that day." : `No jobs in ${monthLabel}.`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
