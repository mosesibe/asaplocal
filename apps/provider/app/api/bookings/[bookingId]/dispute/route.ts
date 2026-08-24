import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, notify, sendEmail, emailTemplates } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({
  response: z.string().min(5).max(1000),
  photos: z.array(z.string().url()).max(10).default([]),
});

/** Provider responds to an open dispute and marks it resolved — the booking returns to AWAITING_APPROVAL for the customer to reconfirm. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, jobRequest: true },
  });
  if (!booking || booking.businessId !== business.id) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (booking.status !== "DISPUTED") {
    return NextResponse.json({ message: "This booking has no open dispute" }, { status: 400 });
  }

  const dispute = await prisma.bookingDispute.findFirst({ where: { bookingId, status: "OPEN" }, orderBy: { createdAt: "desc" } });
  if (!dispute) return NextResponse.json({ message: "This booking has no open dispute" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  await prisma.$transaction([
    prisma.bookingDispute.update({
      where: { id: dispute.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        providerResponse: parsed.data.response,
        providerPhotos: parsed.data.photos,
      },
    }),
    prisma.booking.update({ where: { id: bookingId }, data: { status: "AWAITING_APPROVAL" } }),
  ]);

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "booking.dispute_resolved",
    targetType: "Booking",
    targetId: bookingId,
    metadata: { disputeId: dispute.id },
  });

  await notify(
    booking.customerId,
    "DISPUTE_RESOLVED",
    `${business.name} responded to your issue`,
    "Take a look and confirm completion, or raise it again if it's still not right.",
    `/bookings/${bookingId}`
  );

  await sendEmail({
    to: booking.customer.email,
    subject: `${business.name} responded to your issue`,
    ...emailTemplates.disputeResolvedCustomer({
      businessName: business.name,
      jobTitle: booking.jobRequest?.title ?? "your job",
      response: parsed.data.response,
      link: `${process.env.NEXT_PUBLIC_WEB_URL}/bookings/${bookingId}`,
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
