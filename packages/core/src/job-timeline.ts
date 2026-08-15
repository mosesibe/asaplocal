export interface JobTimelineEntry {
  label: string;
  at: Date;
}

export function buildJobTimeline(input: {
  jobPostedAt?: Date | null;
  bookingConfirmedAt?: Date | null;
  paymentReceivedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
}): JobTimelineEntry[] {
  const entries: JobTimelineEntry[] = [];
  if (input.jobPostedAt) entries.push({ label: "Job posted", at: input.jobPostedAt });
  if (input.bookingConfirmedAt) entries.push({ label: "Booking confirmed", at: input.bookingConfirmedAt });
  if (input.paymentReceivedAt) entries.push({ label: "Payment received", at: input.paymentReceivedAt });
  if (input.startedAt) entries.push({ label: "Job started", at: input.startedAt });
  if (input.completedAt) entries.push({ label: "Job completed", at: input.completedAt });
  return entries.sort((a, b) => a.at.getTime() - b.at.getTime());
}
