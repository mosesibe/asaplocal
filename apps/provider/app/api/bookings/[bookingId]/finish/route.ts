import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, notify } from "@asaplocal/core";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.businessId !== business.id) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (booking.status !== "IN_PROGRESS") return NextResponse.json({ message: "Only a job in progress can be finished" }, { status: 400 });

  const entryCount = await prisma.jobSheetEntry.count({ where: { bookingId } });
  if (entryCount === 0) {
    return NextResponse.json({ message: "Add at least one action to the job sheet before finishing" }, { status: 400 });
  }

  const completedAt = new Date();
  const durationMinutes = booking.startedAt ? Math.round((completedAt.getTime() - booking.startedAt.getTime()) / 60000) : null;

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "AWAITING_APPROVAL", completedAt, durationMinutes },
  });

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "booking.finish_job",
    targetType: "Booking",
    targetId: bookingId,
    metadata: { durationMinutes },
  });

  await notify(
    booking.customerId,
    "BOOKING_AWAITING_APPROVAL",
    "Your job is marked as done",
    `${business.name} has finished the job — review what was done and confirm completion.`,
    `/bookings/${bookingId}`
  );

  return NextResponse.json({ ok: true, durationMinutes });
}
