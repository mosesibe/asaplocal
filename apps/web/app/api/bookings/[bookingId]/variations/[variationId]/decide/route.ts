import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { notify, sendEmail, emailTemplates, writeAuditLog } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ accept: z.boolean() });

/** Customer accepts or rejects a proposed variation. Only ACCEPTED ones become billable. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string; variationId: string }> }) {
  const { bookingId, variationId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const variation = await prisma.bookingVariation.findUnique({
    where: { id: variationId },
    include: { booking: { include: { business: { include: { owner: true } }, jobRequest: true } } },
  });
  if (!variation || variation.bookingId !== bookingId) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (variation.booking.customerId !== session.user.id) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (variation.status !== "PENDING") {
    return NextResponse.json({ message: "You've already decided on this extra" }, { status: 409 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  await prisma.bookingVariation.update({
    where: { id: variationId },
    data: { status: parsed.data.accept ? "ACCEPTED" : "REJECTED", decidedAt: new Date() },
  });

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: parsed.data.accept ? "booking.variation_accepted" : "booking.variation_rejected",
    targetType: "Booking",
    targetId: bookingId,
    metadata: { variationId, amountPence: variation.amountPence },
  });

  await notify(
    variation.booking.business.ownerId,
    "VARIATION_DECIDED",
    parsed.data.accept ? "Extra work approved" : "Extra work declined",
    variation.description,
    `/calendar/${bookingId}`
  );

  await sendEmail({
    to: variation.booking.business.owner.email,
    subject: parsed.data.accept ? "Your extra work was approved" : "Your extra work was declined",
    ...emailTemplates.variationDecidedProvider({
      businessName: variation.booking.business.name,
      jobTitle: variation.booking.jobRequest?.title ?? "your job",
      description: variation.description,
      amountPence: variation.amountPence,
      accepted: parsed.data.accept,
      link: `${process.env.NEXT_PUBLIC_PROVIDER_URL}/calendar/${bookingId}`,
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
