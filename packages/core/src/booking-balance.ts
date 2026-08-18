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

  return {
    basePence: booking.totalAmountPence,
    extrasPence,
    totalPence,
    paidPence,
    outstandingPence: Math.max(0, totalPence - paidPence),
  };
}
