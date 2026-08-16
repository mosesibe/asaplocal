import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { notify } from "@asaplocal/core";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { jobRequest: { include: { lead: true } }, business: true },
  });
  if (!quote || quote.jobRequest.customerId !== session.user.id) {
    return NextResponse.json({ message: "Quote not found" }, { status: 404 });
  }
  if (quote.status !== "SENT" && quote.status !== "PENDING") {
    return NextResponse.json({ message: "Quote is no longer available" }, { status: 409 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.quote.update({ where: { id: quote.id }, data: { status: "ACCEPTED" } });
    await tx.quote.updateMany({
      where: { jobRequestId: quote.jobRequestId, id: { not: quote.id }, status: { in: ["SENT", "PENDING"] } },
      data: { status: "DECLINED" },
    });

    const booking = await tx.booking.create({
      data: {
        customerId: session.user.id,
        businessId: quote.businessId,
        jobRequestId: quote.jobRequestId,
        quoteId: quote.id,
        scheduledDate: quote.jobRequest.preferredDate ?? new Date(Date.now() + 3 * 24 * 3600 * 1000),
        totalAmountPence: quote.amountPence,
        depositAmountPence: Math.round(quote.amountPence * 0.2),
        addressLine: quote.jobRequest.addressLine ?? "",
        city: quote.jobRequest.city,
        postcode: quote.jobRequest.postcode,
        status: "PENDING",
      },
    });

    await tx.jobRequest.update({ where: { id: quote.jobRequestId }, data: { status: "ASSIGNED" } });

    // The provider has won the job the moment their quote is accepted — without
    // this their lead pipeline still reads "QUOTED" indefinitely. The Stripe
    // webhook sets the same thing on payment, but that fires later (and only
    // once its signing secret is configured), so acceptance is the reliable
    // point to record it.
    if (quote.jobRequest.lead) {
      await tx.leadAccess.updateMany({
        where: { leadId: quote.jobRequest.lead.id, businessId: quote.businessId },
        data: { status: "WON", wonAt: new Date() },
      });
    }

    await tx.conversation.create({
      data: {
        jobRequestId: quote.jobRequestId,
        bookingId: booking.id,
        participants: { create: [{ userId: session.user.id }, { userId: quote.business.ownerId }] },
      },
    });

    return booking;
  });

  // Link straight to the lead the quote was for — "/leads" dropped the provider
  // on the generic marketplace with no indication which job had been accepted.
  await notify(
    quote.business.ownerId,
    "QUOTE_ACCEPTED",
    "Your quote was accepted!",
    quote.jobRequest.title,
    quote.jobRequest.lead ? `/leads/${quote.jobRequest.lead.id}` : `/calendar/${result.id}`
  );

  return NextResponse.json({ bookingId: result.id });
}
