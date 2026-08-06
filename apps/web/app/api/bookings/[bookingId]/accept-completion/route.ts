import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, notify } from "@asaplocal/core";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { business: true } });
  if (!booking || booking.customerId !== session.user.id) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (booking.status !== "AWAITING_APPROVAL") {
    return NextResponse.json({ message: "This booking isn't awaiting your approval" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { status: "COMPLETED" } }),
    ...(booking.jobRequestId ? [prisma.jobRequest.update({ where: { id: booking.jobRequestId }, data: { status: "COMPLETED" } })] : []),
  ]);

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "booking.accept_completion",
    targetType: "Booking",
    targetId: bookingId,
  });

  await notify(
    booking.business.ownerId,
    "BOOKING_COMPLETED",
    "Customer confirmed the job is complete",
    `Your customer has confirmed the job as complete.`,
    `/calendar/${bookingId}`
  );

  return NextResponse.json({ ok: true });
}
