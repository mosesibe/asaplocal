import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { notify } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ isActive: z.boolean() });

/** Deactivating a staff member also clears them off any upcoming booking they're assigned to, notifying the affected customer. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const staffMember = await prisma.staffMember.findUnique({ where: { id: staffId } });
  if (!staffMember || staffMember.businessId !== business.id) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (staffMember.approvalStatus !== "VERIFIED") {
    return NextResponse.json({ message: "Only approved staff can be toggled" }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  await prisma.staffMember.update({ where: { id: staffId }, data: { isActive: parsed.data.isActive } });

  if (!parsed.data.isActive) {
    const affectedBookings = await prisma.booking.findMany({
      where: { assignedStaffId: staffId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    });
    for (const booking of affectedBookings) {
      await prisma.booking.update({ where: { id: booking.id }, data: { assignedStaffId: null, assignedAt: null } });
      await notify(
        booking.customerId,
        "STAFF_ASSIGNED",
        "Staff assignment update",
        `${staffMember.fullName} is no longer assigned to your booking — your provider will confirm who's attending shortly.`,
        `/bookings/${booking.id}`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
