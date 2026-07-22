import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { reviewSchema, moderateReview, stripHtml, notify } from "@asaplocal/core";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Invalid review", issues: parsed.error.flatten() }, { status: 422 });

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId }, include: { review: true, business: true } });
  if (!booking || booking.customerId !== session.user.id) return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  if (booking.status !== "COMPLETED") return NextResponse.json({ message: "You can only review completed bookings" }, { status: 409 });
  if (booking.review) return NextResponse.json({ message: "You've already reviewed this booking" }, { status: 409 });

  const comment = parsed.data.comment ? stripHtml(parsed.data.comment) : undefined;
  const moderation = await moderateReview(comment ?? "", parsed.data.rating);

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        bookingId: booking.id,
        authorId: session.user.id,
        businessId: booking.businessId,
        rating: parsed.data.rating,
        comment,
        photos: parsed.data.photos,
        status: moderation.flagged ? "FLAGGED" : "PUBLISHED",
        aiFlagged: moderation.flagged,
        aiFlagReason: moderation.reason,
      },
    });

    if (!moderation.flagged) {
      const agg = await tx.review.aggregate({ where: { businessId: booking.businessId, status: "PUBLISHED" }, _avg: { rating: true }, _count: true });
      await tx.business.update({
        where: { id: booking.businessId },
        data: { avgRating: agg._avg.rating ?? parsed.data.rating, reviewCount: agg._count },
      });
    }
    return created;
  });

  await notify(booking.business.ownerId, "REVIEW_RECEIVED", "You've received a new review", `${parsed.data.rating}★ from a customer`, `/reviews`);

  return NextResponse.json({ id: review.id, flagged: moderation.flagged }, { status: 201 });
}
