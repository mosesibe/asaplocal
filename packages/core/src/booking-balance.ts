export interface BookingBalance {
  /** Original agreed price (the accepted quote). */
  basePence: number;
  /** Sum of variations the customer has accepted. */
  extrasPence: number;
  /** basePence + extrasPence — what the job now costs in total. */
  totalPence: number;
  /** Everything already collected (deposit, and any earlier balance payment). */
  paidPence: number;
  /** What's still owed. Never negative. */
  outstandingPence: number;
  /**
   * The deposit taken up front, 0 if the booking has none. This is a slice of
   * totalPence, not an addition to it.
   */
  depositPence: number;
  /**
   * The deposit if it has not been collected yet, otherwise 0. Nothing paid at
   * all is the only state in which a deposit is still the amount due — once any
   * money has landed, what is owed is the balance.
   */
  depositDuePence: number;
}

/**
 * Single source of truth for what a booking costs and what's still owed.
 *
 * Used by the checkout route, the customer's booking page and the Stripe
 * webhook — if any of them derived this independently they could disagree,
 * and the one that decides the charge amount would win. Only ACCEPTED
 * variations count: a pending or rejected extra is never billable.
 */
export function computeBookingBalance(booking: {
  totalAmountPence: number;
  depositAmountPence?: number | null;
  variations?: { status: string; amountPence: number }[];
  payments?: { status: string; amountPence: number }[];
}): BookingBalance {
  const extrasPence = (booking.variations ?? [])
    .filter((v) => v.status === "ACCEPTED")
    .reduce((sum, v) => sum + v.amountPence, 0);

  const paidPence = (booking.payments ?? [])
    .filter((p) => p.status === "SUCCEEDED")
    .reduce((sum, p) => sum + p.amountPence, 0);

  const totalPence = booking.totalAmountPence + extrasPence;
  // Never quote a deposit larger than the job: a variation could in principle
  // be declined after the deposit was set from a bigger figure.
  const depositPence = Math.min(booking.depositAmountPence ?? 0, totalPence);

  return {
    basePence: booking.totalAmountPence,
    extrasPence,
    totalPence,
    paidPence,
    outstandingPence: Math.max(0, totalPence - paidPence),
    depositPence,
    depositDuePence: paidPence === 0 ? depositPence : 0,
  };
}
