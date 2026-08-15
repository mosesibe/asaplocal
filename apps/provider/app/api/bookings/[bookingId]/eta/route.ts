import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { notify, publishBookingUpdate } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ etaMinutes: z.number().int().min(1).max(180), trackingEnabled: z.boolean() });

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

  await prisma.booking.update({
    where: { id: bookingId },
    data: { etaMinutes: parsed.data.etaMinutes, trackingEnabled: parsed.data.trackingEnabled },
  });

  await notify(
    booking.customerId,
    "PROVIDER_ON_THE_WAY",
    "Your provider is on the way",
    `Arriving in about ${parsed.data.etaMinutes} min`,
    `/bookings/${bookingId}`
  );
  await publishBookingUpdate(bookingId, "eta-update", { etaMinutes: parsed.data.etaMinutes, trackingEnabled: parsed.data.trackingEnabled });

  return NextResponse.json({ ok: true });
}
