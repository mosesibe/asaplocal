import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// JSON counterpart to /calendar (a server component that queries Prisma
// directly) — mirrors its exact data shape: month-grid job spans (a job that
// started in an earlier month and hasn't resolved yet still needs to appear
// on this month's grid), month stats, and the upcoming/listed booking rows.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const monthParamRaw = searchParams.get("month");
  const dayParam = searchParams.get("day") ?? undefined;

  const now = new Date();
  const parsed = monthParamRaw && /^\d{4}-\d{2}$/.test(monthParamRaw) ? monthParamRaw.split("-").map(Number) : null;
  const year = parsed?.[0] ?? now.getFullYear();
  const month = parsed?.[1] ?? now.getMonth() + 1; // 1-12

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const [monthBookings, spanningIntoMonth, upcoming] = await Promise.all([
    prisma.booking.findMany({
      where: { businessId: business.id, scheduledDate: { gte: monthStart, lt: monthEnd } },
      orderBy: { scheduledDate: "asc" },
      include: { customer: { include: { profile: true } }, assignedStaff: true, jobRequest: true },
    }),
    prisma.booking.findMany({
      where: {
        businessId: business.id,
        startedAt: { lt: monthStart },
        OR: [{ completedAt: { gte: monthStart } }, { completedAt: null }],
      },
      include: { customer: { include: { profile: true } }, assignedStaff: true, jobRequest: true },
    }),
    prisma.booking.findMany({
      where: {
        businessId: business.id,
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS", "AWAITING_APPROVAL", "DISPUTED"] },
        scheduledDate: { gte: now },
      },
      orderBy: { scheduledDate: "asc" },
      take: 5,
      include: { jobRequest: true },
    }),
  ]);

  const gridBookings = [...monthBookings, ...spanningIntoMonth.filter((b) => !monthBookings.some((m) => m.id === b.id))];
  const jobs = gridBookings.map((b) => {
    const resolved = b.status === "COMPLETED" || b.status === "CANCELLED";
    const start = b.startedAt ?? b.scheduledDate;
    const end = !b.startedAt ? b.scheduledDate : resolved ? (b.completedAt ?? b.cancelledAt ?? b.startedAt) : now;
    return { id: b.id, status: b.status, title: b.jobRequest?.title ?? "Booking", startKey: dayKey(start), endKey: dayKey(end) };
  });

  const completedThisMonth = monthBookings.filter((b) => b.status === "COMPLETED");
  const earnedThisMonth = monthBookings.reduce((sum, b) => sum + (b.settledAt ? (b.providerNetPence ?? 0) : 0), 0);
  const listed = dayParam ? monthBookings.filter((b) => dayKey(b.scheduledDate) === dayParam) : monthBookings;

  return NextResponse.json({
    year,
    month,
    todayKey: dayKey(now),
    jobs,
    monthBookingsCount: monthBookings.length,
    completedCount: completedThisMonth.length,
    earnedPence: earnedThisMonth,
    upcoming: upcoming.map((b) => ({ id: b.id, title: b.jobRequest?.title ?? "Booking", scheduledDate: b.scheduledDate, status: b.status })),
    listed: listed.map((b) => ({
      id: b.id,
      title: b.jobRequest?.title ?? "Booking",
      customerName: `${b.customer.profile?.firstName ?? ""} ${b.customer.profile?.lastName ?? ""}`.trim(),
      scheduledDate: b.scheduledDate,
      addressLine: b.addressLine,
      city: b.city,
      status: b.status,
      assignedStaffName: b.assignedStaff?.fullName ?? null,
      earnedPence: b.settledAt ? b.providerNetPence : null,
    })),
  });
}
