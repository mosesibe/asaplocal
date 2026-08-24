import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, notify, sendEmail, emailTemplates } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({
  reason: z.string().min(10).max(1000),
  photos: z.array(z.string().url()).max(10).default([]),
});

/** Customer disputes a job the provider marked done, instead of accepting completion. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { business: { include: { owner: true } }, jobRequest: true },
  });
  if (!booking || booking.customerId !== session.user.id) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (booking.status !== "AWAITING_APPROVAL") {
    return NextResponse.json({ message: "This booking isn't awaiting your approval" }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const [dispute] = await prisma.$transaction([
    prisma.bookingDispute.create({
      data: { bookingId, raisedById: session.user.id, reason: parsed.data.reason, photos: parsed.data.photos },
    }),
    prisma.booking.update({ where: { id: bookingId }, data: { status: "DISPUTED" } }),
  ]);

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "booking.dispute_raised",
    targetType: "Booking",
    targetId: bookingId,
    metadata: { disputeId: dispute.id },
  });

  await notify(
    booking.business.ownerId,
    "BOOKING_DISPUTED",
    "Customer reported an issue",
    `Instead of accepting completion, they raised an issue on ${booking.jobRequest?.title ?? "a job"}.`,
    `/calendar/${bookingId}`
  );

  await sendEmail({
    to: booking.business.owner.email,
    subject: "A customer reported an issue with a completed job",
    ...emailTemplates.disputeRaisedProvider({
      businessName: booking.business.name,
      jobTitle: booking.jobRequest?.title ?? "your job",
      reason: parsed.data.reason,
      link: `${process.env.NEXT_PUBLIC_PROVIDER_URL}/calendar/${bookingId}`,
    }),
  }).catch(() => {});

  return NextResponse.json({ id: dispute.id }, { status: 201 });
}
