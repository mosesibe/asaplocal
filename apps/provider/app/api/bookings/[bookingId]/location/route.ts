import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { publishBookingUpdate } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.businessId !== business.id) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (!booking.trackingEnabled || !["CONFIRMED", "IN_PROGRESS"].includes(booking.status)) {
    return NextResponse.json({ message: "Tracking is not active for this booking" }, { status: 409 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid coordinates" }, { status: 422 });

  const providerLocationUpdatedAt = new Date();
  await prisma.booking.update({
    where: { id: bookingId },
    data: { providerLat: parsed.data.lat, providerLng: parsed.data.lng, providerLocationUpdatedAt },
  });

  await publishBookingUpdate(bookingId, "location-update", { lat: parsed.data.lat, lng: parsed.data.lng, at: providerLocationUpdatedAt.toISOString() });

  return NextResponse.json({ ok: true });
}
