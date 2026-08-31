import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

// JSON counterpart to the /calendar/[bookingId] server-rendered page's core
// data. Originally the mobile app only needed the job-sheet flow
// (start/log/finish); now also carries the ETA/variations/disputes/staff
// data the web page's OnTheWayPanel/VariationPanel/DisputePanel/staff
// assignment need, since the mobile booking-detail screen renders those too.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { include: { profile: true } },
      jobSheetEntries: { orderBy: { loggedAt: "asc" } },
      jobRequest: { include: { lead: true } },
      assignedStaff: true,
      variations: { orderBy: { createdAt: "asc" } },
      disputes: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!booking || booking.businessId !== business.id) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const customerName = booking.customer.profile
    ? `${booking.customer.profile.firstName} ${booking.customer.profile.lastName}`
    : booking.customer.email;

  return NextResponse.json({
    booking: {
      id: booking.id,
      status: booking.status,
      title: booking.jobRequest?.title ?? "Booking",
      leadId: booking.jobRequest?.lead?.id ?? null,
      customerName,
      scheduledDate: booking.scheduledDate,
      addressLine: booking.addressLine,
      city: booking.city,
      durationMinutes: booking.durationMinutes,
      etaMinutes: booking.etaMinutes,
      trackingEnabled: booking.trackingEnabled,
      assignedStaff: booking.assignedStaff ? { id: booking.assignedStaff.id, fullName: booking.assignedStaff.fullName } : null,
    },
    jobSheetEntries: booking.jobSheetEntries.map((e) => ({
      id: e.id,
      description: e.description,
      photos: e.photos,
      loggedAt: e.loggedAt,
    })),
    variations: booking.variations.map((v) => ({
      id: v.id,
      description: v.description,
      amountPence: v.amountPence,
      status: v.status,
      photos: v.photos,
      createdAt: v.createdAt,
    })),
    disputes: booking.disputes.map((d) => ({
      id: d.id,
      reason: d.reason,
      photos: d.photos,
      status: d.status,
      providerResponse: d.providerResponse,
      providerPhotos: d.providerPhotos,
      createdAt: d.createdAt,
    })),
  });
}
