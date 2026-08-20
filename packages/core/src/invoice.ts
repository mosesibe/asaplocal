/**
 * Human-readable invoice reference derived from the Payment id.
 *
 * Lives in core so the number on a customer's emailed invoice is provably the
 * same one admin shows on the invoices page — two implementations could drift
 * and leave a customer quoting a reference support can't find.
 */
export function invoiceNumber(paymentId: string) {
  return `INV-${paymentId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
