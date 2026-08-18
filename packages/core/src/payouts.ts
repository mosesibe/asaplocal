import { prisma } from "@asaplocal/db";
import { stripe } from "./stripe";
import { computeBookingBalance } from "./booking-balance";
import { notify } from "./notify";

/**
 * Platform commission on job value, as a percentage. Configurable so the rate
 * can change without a deploy — but note it's applied at settlement time, so
 * changing it only affects jobs settled from that point on.
 */
export const COMMISSION_PCT = Number(process.env.PLATFORM_COMMISSION_PCT ?? 10);

export interface Settlement {
  collectedPence: number;
  platformFeePence: number;
  providerNetPence: number;
}

/** Commission is charged on everything collected for the job, variations included. */
export function computeSettlement(collectedPence: number, commissionPct = COMMISSION_PCT): Settlement {
  const platformFeePence = Math.round(collectedPence * (commissionPct / 100));
  return { collectedPence, platformFeePence, providerNetPence: collectedPence - platformFeePence };
}

/**
 * Settles a booking once it is COMPLETED and paid in full.
 *
 * Model B: funds are held on the platform until the customer signs the job
 * off, then transferred — so a deposit stays refundable and a dispute doesn't
 * require clawing money back out of a provider's account.
 *
 * Falls back (model D) when the provider hasn't finished Connect onboarding:
 * the entitlement is still recorded on the Booking so the admin payouts page
 * shows what's owed, but no Payout row is written — a Payout means money has
 * actually moved.
 *
 * Idempotent: returns early if already settled, so it is safe to call from the
 * webhook on every successful payment.
 */
export async function settleBookingPayout(bookingId: string): Promise<
  { settled: false; reason: string } | { settled: true; method: "STRIPE_CONNECT" | "PENDING_MANUAL"; settlement: Settlement }
> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { business: true, payments: true, variations: true, jobRequest: true },
  });
  if (!booking) return { settled: false, reason: "booking not found" };
  if (booking.settledAt) return { settled: false, reason: "already settled" };
  if (booking.status !== "COMPLETED") return { settled: false, reason: `status is ${booking.status}` };

  const balance = computeBookingBalance(booking);
  if (balance.outstandingPence > 0) return { settled: false, reason: "not paid in full" };

  const settlement = computeSettlement(balance.paidPence);

  // Record the entitlement regardless of whether we can pay it out yet.
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      platformFeePence: settlement.platformFeePence,
      providerNetPence: settlement.providerNetPence,
      settledAt: new Date(),
    },
  });

  const canTransfer = Boolean(booking.business.stripeAccountId) && booking.business.payoutsEnabled;
  if (!canTransfer) {
    await notify(
      booking.business.ownerId,
      "SYSTEM",
      "Payout pending — connect your bank",
      "Your job is paid in full. Finish bank setup to receive payouts automatically.",
      "/verification/banking"
    );
    return { settled: true, method: "PENDING_MANUAL", settlement };
  }

  const transfer = await stripe.transfers.create({
    amount: settlement.providerNetPence,
    currency: "gbp",
    destination: booking.business.stripeAccountId!,
    transfer_group: `booking_${bookingId}`,
    metadata: { bookingId, businessId: booking.businessId },
  });

  await prisma.payout.create({
    data: {
      businessId: booking.businessId,
      bookingId,
      amountPence: settlement.providerNetPence,
      platformFeePence: settlement.platformFeePence,
      method: "STRIPE_CONNECT",
      stripeTransferId: transfer.id,
      reference: booking.jobRequest?.title ?? undefined,
    },
  });

  await notify(
    booking.business.ownerId,
    "PAYMENT_RECEIVED",
    "You've been paid",
    `${booking.jobRequest?.title ?? "Your job"} — payout on its way to your bank.`,
    `/calendar/${bookingId}`
  );

  return { settled: true, method: "STRIPE_CONNECT", settlement };
}
