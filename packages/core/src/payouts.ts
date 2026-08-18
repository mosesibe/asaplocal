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

export interface ProviderBalance {
  settledPence: number;
  paidOutPence: number;
  /** Earned, settled, and not yet transferred — what a withdrawal would move. */
  availablePence: number;
}

/**
 * What a provider has earned versus what's actually reached them.
 *
 * "Settled" is the net entitlement recorded on completed, fully-paid bookings;
 * "paid out" is money that has genuinely moved (a Payout row). The difference
 * accrues when a job completes before the provider finished Connect onboarding.
 */
export async function computeProviderBalance(businessId: string): Promise<ProviderBalance> {
  const [settled, paidOut] = await Promise.all([
    prisma.booking.aggregate({ where: { businessId, settledAt: { not: null } }, _sum: { providerNetPence: true } }),
    prisma.payout.aggregate({ where: { businessId }, _sum: { amountPence: true } }),
  ]);
  const settledPence = settled._sum.providerNetPence ?? 0;
  const paidOutPence = paidOut._sum.amountPence ?? 0;
  return { settledPence, paidOutPence, availablePence: Math.max(0, settledPence - paidOutPence) };
}

/**
 * Transfers every settled-but-unpaid booking for a provider.
 *
 * This is what lets a provider who completed jobs *before* connecting a bank
 * collect the backlog: their entitlements accrued on the bookings, and this
 * releases them once an account exists. Called automatically when Connect
 * onboarding completes, and manually from the provider's banking page.
 *
 * Per-booking failures are isolated so one bad transfer can't strand the rest,
 * and `payouts: { none: {} }` means an already-paid booking is never picked up
 * twice even if this runs concurrently with settleBookingPayout().
 */
export async function sweepOutstandingPayouts(businessId: string): Promise<{
  transferredPence: number;
  bookingsPaid: number;
  failures: number;
  reason?: string;
}> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business?.stripeAccountId || !business.payoutsEnabled) {
    return { transferredPence: 0, bookingsPaid: 0, failures: 0, reason: "no connected account" };
  }

  const unpaid = await prisma.booking.findMany({
    where: { businessId, settledAt: { not: null }, providerNetPence: { gt: 0 }, payouts: { none: {} } },
    include: { jobRequest: true },
  });

  let transferredPence = 0;
  let bookingsPaid = 0;
  let failures = 0;

  for (const booking of unpaid) {
    try {
      const amount = booking.providerNetPence!;
      const transfer = await stripe.transfers.create({
        amount,
        currency: "gbp",
        destination: business.stripeAccountId,
        transfer_group: `booking_${booking.id}`,
        metadata: { bookingId: booking.id, businessId, sweep: "true" },
      });
      await prisma.payout.create({
        data: {
          businessId,
          bookingId: booking.id,
          amountPence: amount,
          platformFeePence: booking.platformFeePence ?? 0,
          method: "STRIPE_CONNECT",
          stripeTransferId: transfer.id,
          reference: booking.jobRequest?.title ?? undefined,
        },
      });
      transferredPence += amount;
      bookingsPaid++;
    } catch (err) {
      failures++;
      console.error("[settlement] sweep transfer failed", booking.id, err);
    }
  }

  if (bookingsPaid > 0) {
    await notify(
      business.ownerId,
      "PAYMENT_RECEIVED",
      "Payout on its way",
      `${bookingsPaid} job${bookingsPaid > 1 ? "s" : ""} paid out to your bank.`,
      "/verification/banking"
    );
  }

  return { transferredPence, bookingsPaid, failures };
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
