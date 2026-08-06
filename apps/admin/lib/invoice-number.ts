export function invoiceNumber(paymentId: string) {
  return `INV-${paymentId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
