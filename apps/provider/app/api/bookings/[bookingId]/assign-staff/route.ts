import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, notify } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ staffMemberId: z.string().uuid().nullable() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.businessId !== business.id) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });
  const { staffMemberId } = parsed.data;

  let staffMember = null;
  if (staffMemberId) {
    staffMember = await prisma.staffMember.findUnique({ where: { id: staffMemberId } });
    if (!staffMember || staffMember.businessId !== business.id || staffMember.approvalStatus !== "VERIFIED" || !staffMember.isActive) {
      return NextResponse.json({ message: "That staff member isn't available for assignment" }, { status: 400 });
    }
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { assignedStaffId: staffMemberId, assignedAt: staffMemberId ? new Date() : null },
  });

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: staffMemberId ? "booking.assign_staff" : "booking.unassign_staff",
    targetType: "Booking",
    targetId: bookingId,
    metadata: { staffMemberId },
  });

  if (staffMember) {
    await notify(
      booking.customerId,
      "STAFF_ASSIGNED",
      "Staff assigned to your booking",
      `${staffMember.fullName}${staffMember.jobTitle ? ` (${staffMember.jobTitle})` : ""} will be attending your booking.`,
      `/bookings/${bookingId}`
    );
  }

  return NextResponse.json({ ok: true });
}
