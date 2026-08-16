import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@asaplocal/core";
import { prisma } from "@asaplocal/db";
import { notify, emailTemplates, sendEmail, completeReferralOnFirstPayment, buildJobTimeline } from "@asaplocal/core";
import type Stripe from "stripe";

/**
 * Handles booking-payment events for the customer app. Signature
 * verification is mandatory — this endpoint must receive the *raw* body,
 * so it's excluded from body-parsing middleware/CSRF (webhooks are
 * authenticated via the Stripe signature, not cookies/CSRF tokens).
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig ?? "", process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const cs = event.data.object as Stripe.Checkout.Session;
      const { bookingId, businessId } = cs.metadata ?? {};
      if (bookingId) {
        const paymentReceivedAt = new Date();
        const booking = await prisma.booking.update({
          where: { id: bookingId },
          data: { status: "CONFIRMED" },
          include: { customer: true, business: { include: { owner: true } }, jobRequest: true },
        });
        await prisma.payment.create({
          data: {
            userId: booking.customerId,
            businessId: businessId ?? booking.businessId,
            bookingId: booking.id,
            type: cs.metadata?.paymentType === "BOOKING_FULL" ? "BOOKING_FULL" : "BOOKING_DEPOSIT",
            status: "SUCCEEDED",
            amountPence: cs.amount_total ?? 0,
            currency: cs.currency ?? "gbp",
            stripePaymentIntentId: typeof cs.payment_intent === "string" ? cs.payment_intent : undefined,
          },
        });
        if (booking.jobRequestId) {
          await prisma.leadAccess.updateMany({
            where: { businessId: booking.businessId, lead: { jobRequestId: booking.jobRequestId } },
            data: { status: "WON", wonAt: paymentReceivedAt },
          });
        }
        await completeReferralOnFirstPayment(booking.customerId).catch(() => {});

        const timeline = buildJobTimeline({
          jobPostedAt: booking.jobRequest?.createdAt,
          bookingConfirmedAt: booking.createdAt,
          paymentReceivedAt,
        });
        const bookingLink = `${process.env.NEXT_PUBLIC_WEB_URL}/bookings/${booking.id}`;

        // Provider-side link must be a provider-app route — it has no /bookings,
        // its per-booking view is /calendar/[bookingId].
        await notify(
          booking.business.ownerId,
          "PAYMENT_RECEIVED",
          "Payment received",
          `Deposit received for ${booking.jobRequest?.title ?? "your booking"}`,
          `/calendar/${booking.id}`
        );
        await notify(booking.customerId, "BOOKING_CONFIRMED", "Payment confirmed", "Your booking is confirmed.", `/bookings/${booking.id}`);
        await sendEmail({
          to: booking.customer.email,
          subject: "Your AsapLocal booking is confirmed",
          ...emailTemplates.bookingConfirmed(bookingLink, timeline),
        }).catch(() => {});
        await sendEmail({
          to: booking.business.owner.email,
          subject: "Payment received — job confirmed",
          ...emailTemplates.paymentReceivedProvider({
            businessName: booking.business.name,
            jobTitle: booking.jobRequest?.title ?? "your job",
            link: bookingLink,
            timeline,
          }),
        }).catch(() => {});
      }
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      if (typeof charge.payment_intent === "string") {
        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: charge.payment_intent },
          data: { status: charge.amount_refunded < charge.amount ? "PARTIALLY_REFUNDED" : "REFUNDED", refundedAmountPence: charge.amount_refunded },
        });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
