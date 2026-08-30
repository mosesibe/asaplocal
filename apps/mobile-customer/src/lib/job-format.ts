// Ports apps/web/lib/job-format.ts exactly, so Activity reads identically
// to web's /activity page.
function formatPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

export function formatBudget(minPence: number | null, maxPence: number | null): string | null {
  if (minPence && maxPence) return `${formatPence(minPence)}–${formatPence(maxPence)}`;
  if (minPence) return `From ${formatPence(minPence)}`;
  if (maxPence) return `Up to ${formatPence(maxPence)}`;
  return null;
}

export function formatJobLocation(job: { addressLine: string | null; city: string; postcode: string | null }): string {
  const line = job.addressLine?.trim();
  const parts = line ? [line] : [];
  const seen = (line ?? '').toLowerCase();
  if (!seen.includes(job.city.toLowerCase())) parts.push(job.city);
  if (job.postcode && !seen.includes(job.postcode.toLowerCase())) parts.push(job.postcode);
  return parts.join(', ');
}

export function formatNeededBy(preferredDate: string | null, flexibleDate: boolean): string {
  if (!preferredDate) return 'As soon as possible';
  const date = new Date(preferredDate);
  const dateLabel = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  if (flexibleDate) return `${dateLabel} · flexible on time`;
  const time = date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
  return `${dateLabel} at ${time}`;
}

export { formatPence };
