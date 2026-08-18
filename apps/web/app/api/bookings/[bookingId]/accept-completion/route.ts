import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, notify, sendEmail, emailTemplates, settleBookingPayout } from "@asaplocal/core";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
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

  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { status: "COMPLETED" } }),
    ...(booking.jobRequestId ? [prisma.jobRequest.update({ where: { id: booking.jobRequestId }, data: { status: "COMPLETED" } })] : []),
  ]);

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "booking.accept_completion",
    targetType: "Booking",
    targetId: bookingId,
  });

  await notify(
    booking.business.ownerId,
    "BOOKING_COMPLETED",
    "Customer confirmed the job is complete",
    `Your customer has confirmed the job as complete.`,
    `/calendar/${bookingId}`
  );

  await sendEmail({
    to: booking.business.owner.email,
    subject: "Job signed off by the customer",
    ...emailTemplates.jobCompletedProvider({
      businessName: booking.business.name,
      jobTitle: booking.jobRequest?.title ?? "your job",
      link: `${process.env.NEXT_PUBLIC_PROVIDER_URL}/calendar/${bookingId}`,
    }),
  }).catch(() => {});

  // If the balance was already settled before sign-off, completion is the
  // trigger instead of the payment. Idempotent either way.
  await settleBookingPayout(bookingId).catch((err) => console.error("[settlement] failed", bookingId, err));

  return NextResponse.json({ ok: true });
}
