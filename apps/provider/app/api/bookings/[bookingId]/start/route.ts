import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog } from "@asaplocal/core";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.businessId !== business.id) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (booking.status !== "CONFIRMED") return NextResponse.json({ message: "Only a confirmed booking can be started" }, { status: 400 });

  const startedAt = new Date();
  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { status: "IN_PROGRESS", startedAt } }),
    ...(booking.jobRequestId ? [prisma.jobRequest.update({ where: { id: booking.jobRequestId }, data: { status: "IN_PROGRESS" } })] : []),
  ]);

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "booking.start_job",
    targetType: "Booking",
    targetId: bookingId,
  });

  return NextResponse.json({ ok: true });
}
