export interface JobTimelineEntry {
  label: string;
  at: Date;
}

export function buildJobTimeline(input: {
  jobPostedAt?: Date | null;
  quoteReceivedAt?: Date | null;
  bookingConfirmedAt?: Date | null;
  paymentReceivedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
}): JobTimelineEntry[] {
  const entries: JobTimelineEntry[] = [];
  if (input.jobPostedAt) entries.push({ label: "Job posted", at: input.jobPostedAt });
  if (input.quoteReceivedAt) entries.push({ label: "First quote received", at: input.quoteReceivedAt });
  if (input.bookingConfirmedAt) entries.push({ label: "Booking confirmed", at: input.bookingConfirmedAt });
  if (input.paymentReceivedAt) entries.push({ label: "Payment received", at: input.paymentReceivedAt });
  if (input.startedAt) entries.push({ label: "Job started", at: input.startedAt });
  if (input.completedAt) entries.push({ label: "Job completed", at: input.completedAt });
  if (input.cancelledAt) entries.push({ label: "Job cancelled", at: input.cancelledAt });
  return entries.sort((a, b) => a.at.getTime() - b.at.getTime());
}
