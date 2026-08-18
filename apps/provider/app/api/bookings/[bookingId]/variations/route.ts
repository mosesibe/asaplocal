import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { notify, sendEmail, emailTemplates, computeBookingBalance, writeAuditLog } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({
  description: z.string().min(5).max(500),
  amountPence: z.number().int().positive().max(10_000_000),
  photos: z.array(z.string().url()).max(10).default([]),
});

/** Provider proposes extra work agreed on site. Not billable until the customer accepts. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, jobRequest: true, variations: true, payments: true },
  });
  if (!booking || booking.businessId !== business.id) return NextResponse.json({ message: "Not found" }, { status: 404 });

  // Only while the job is live — once it's signed off or cancelled the price is settled.
  if (!["CONFIRMED", "IN_PROGRESS", "AWAITING_APPROVAL"].includes(booking.status)) {
    return NextResponse.json({ message: "You can only propose extra work on an active booking" }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const variation = await prisma.bookingVariation.create({
    data: {
      bookingId,
      description: parsed.data.description,
      amountPence: parsed.data.amountPence,
      photos: parsed.data.photos,
    },
  });

  const balance = computeBookingBalance({
    totalAmountPence: booking.totalAmountPence,
    // Show the customer what the total becomes *if* they accept this one.
    variations: [...booking.variations, { status: "ACCEPTED", amountPence: variation.amountPence }],
    payments: booking.payments,
  });

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "booking.variation_proposed",
    targetType: "Booking",
    targetId: bookingId,
    metadata: { variationId: variation.id, amountPence: variation.amountPence },
  });

  await notify(
    booking.customerId,
    "VARIATION_PROPOSED",
    "Extra work proposed",
    `${business.name}: ${parsed.data.description}`,
    `/bookings/${bookingId}`
  );

  await sendEmail({
    to: booking.customer.email,
    subject: `${business.name} has proposed extra work`,
    ...emailTemplates.variationProposedCustomer({
      businessName: business.name,
      jobTitle: booking.jobRequest?.title ?? "your job",
      description: parsed.data.description,
      amountPence: parsed.data.amountPence,
      newTotalPence: balance.totalPence,
      link: `${process.env.NEXT_PUBLIC_WEB_URL}/bookings/${bookingId}`,
    }),
  }).catch(() => {});

  return NextResponse.json({ id: variation.id }, { status: 201 });
}
