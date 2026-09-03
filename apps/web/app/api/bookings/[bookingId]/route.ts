import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { computeBookingBalance } from "@asaplocal/core";

// JSON counterpart to /bookings/[id] (a server component that queries
// Prisma directly) — no such route existed for mobile before. The mobile
// app previously only opened the web /bookings/[id]/checkout page in an
// in-app browser for payment; this route lets it show the full booking
// lifecycle (job sheet, variations, disputes, review gate) natively.
// computeBookingBalance runs here, server-side, so mobile never re-derives
// the same math the checkout route and Stripe webhook already trust.
export async function GET(_req: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      business: true,
      review: true,
      assignedStaff: true,
      jobSheetEntries: { orderBy: { loggedAt: "asc" } },
      jobRequest: true,
      variations: { orderBy: { createdAt: "asc" } },
      payments: true,
      disputes: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!booking || booking.customerId !== session.user.id) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const balance = computeBookingBalance(booking);

  return NextResponse.json({
    id: booking.id,
    status: booking.status,
    scheduledDate: booking.scheduledDate,
    durationMinutes: booking.durationMinutes,
    addressLine: booking.addressLine,
    city: booking.city,
    postcode: booking.postcode,
    notes: booking.notes,
    trackingEnabled: booking.trackingEnabled,
    etaMinutes: booking.etaMinutes,
    providerLat: booking.providerLat != null ? Number(booking.providerLat) : null,
    providerLng: booking.providerLng != null ? Number(booking.providerLng) : null,
    destination: booking.jobRequest ? { lat: Number(booking.jobRequest.lat), lng: Number(booking.jobRequest.lng) } : null,
    business: { id: booking.business.id, slug: booking.business.slug, name: booking.business.name, logoUrl: booking.business.logoUrl, phone: booking.business.phone },
    jobRequestId: booking.jobRequestId,
    balance,
    assignedStaff: booking.assignedStaff
      ? {
          fullName: booking.assignedStaff.fullName,
          jobTitle: booking.assignedStaff.jobTitle,
          profilePhotoUrl: booking.assignedStaff.profilePhotoUrl,
          idFrontImageUrl: booking.assignedStaff.idFrontImageUrl,
          idBackImageUrl: booking.assignedStaff.idBackImageUrl,
        }
      : null,
    jobSheetEntries: booking.jobSheetEntries.map((e) => ({ id: e.id, description: e.description, photos: e.photos, loggedAt: e.loggedAt })),
    variations: booking.variations.map((v) => ({ id: v.id, description: v.description, amountPence: v.amountPence, photos: v.photos, status: v.status, createdAt: v.createdAt })),
    disputes: booking.disputes.map((d) => ({
      id: d.id,
      reason: d.reason,
      photos: d.photos,
      status: d.status,
      providerResponse: d.providerResponse,
      providerPhotos: d.providerPhotos,
      createdAt: d.createdAt,
    })),
    review: booking.review ? { id: booking.review.id, rating: booking.review.rating, comment: booking.review.comment } : null,
  });
}
