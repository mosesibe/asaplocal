import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { stripe } from "@asaplocal/core";

/**
 * Creates a Stripe Checkout Session for a booking deposit or full payment.
 * Amount is always re-derived server-side from the Booking record — never
 * trust a client-supplied amount.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { bookingId, paymentKind } = await req.json();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { business: true, customer: true } });
  if (!booking || booking.customerId !== session.user.id) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const amountPence = paymentKind === "BOOKING_FULL" ? booking.totalAmountPence : booking.depositAmountPence ?? booking.totalAmountPence;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: booking.customer.email,
    line_items: [
      {
        price_data: {
          currency: "gbp",
          unit_amount: amountPence,
          product_data: { name: `${paymentKind === "BOOKING_FULL" ? "Full payment" : "Deposit"} — ${booking.business.name}` },
        },
        quantity: 1,
      },
    ],
    metadata: { bookingId: booking.id, userId: session.user.id, businessId: booking.businessId, paymentType: paymentKind },
    success_url: `${process.env.NEXT_PUBLIC_WEB_URL}/bookings/${booking.id}?paid=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_WEB_URL}/bookings/${booking.id}/checkout?cancelled=1`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
