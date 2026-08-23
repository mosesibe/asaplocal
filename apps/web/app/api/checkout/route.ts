import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { stripe, computeBookingBalance } from "@asaplocal/core";

/**
 * Creates a Stripe Checkout Session for a booking deposit or full payment.
 * Amount is always re-derived server-side from the Booking record — never
 * trust a client-supplied amount.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { bookingId, paymentKind } = await req.json();
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { business: true, customer: true, variations: true, payments: true },
  });
  if (!booking || booking.customerId !== session.user.id) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const balance = computeBookingBalance(booking);

  // BOOKING_BALANCE is what's still owed (incl. accepted extras) — distinct from
  // BOOKING_FULL, which is the whole job price and would double-charge anyone
  // who has already paid a deposit.
  const amountPence =
    paymentKind === "BOOKING_BALANCE"
      ? balance.outstandingPence
      : paymentKind === "BOOKING_FULL"
        ? balance.totalPence
        : (booking.depositAmountPence ?? booking.totalAmountPence);

  if (amountPence <= 0) {
    return NextResponse.json({ message: "This booking is already paid in full" }, { status: 400 });
  }

  // The deposit branch above reads depositAmountPence straight off the booking,
  // so without this a second press of "Pay deposit" would charge it again —
  // the <= 0 check never catches it because the deposit itself is unchanged.
  // Once any money has landed, what is owed is the balance, not a deposit.
  if (paymentKind !== "BOOKING_BALANCE" && balance.paidPence > 0) {
    return NextResponse.json(
      { message: "A payment has already been made for this booking — pay the remaining balance instead." },
      { status: 409 }
    );
  }

  const label =
    paymentKind === "BOOKING_BALANCE" ? "Balance" : paymentKind === "BOOKING_FULL" ? "Full payment" : "Deposit";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: booking.customer.email,
    line_items: [
      {
        price_data: {
          currency: "gbp",
          unit_amount: amountPence,
          product_data: { name: `${label} — ${booking.business.name}` },
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
