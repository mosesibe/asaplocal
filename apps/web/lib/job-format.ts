import { formatPence } from "@asaplocal/ui";

/** "£40.00–£90.00" / "From £40.00" / "Up to £90.00", or null when no budget was set. */
export function formatBudget(minPence: number | null, maxPence: number | null): string | null {
  if (minPence && maxPence) return `${formatPence(minPence)}–${formatPence(maxPence)}`;
  if (minPence) return `From ${formatPence(minPence)}`;
  if (maxPence) return `Up to ${formatPence(maxPence)}`;
  return null;
}

/**
 * Full address from whichever parts the customer gave.
 *
 * addressLine is often already a fully formatted address (Google Places
 * autocomplete returns e.g. "1 Railway Cottages, Old Station Way, Bordon,
 * Hampshire, GU35 9HH"), so city/postcode are only appended when they aren't
 * already in it — otherwise the town and postcode render twice.
 */
export function formatJobLocation(job: { addressLine: string | null; city: string; postcode: string | null }): string {
  const line = job.addressLine?.trim();
  const parts = line ? [line] : [];
  const seen = (line ?? "").toLowerCase();
  if (!seen.includes(job.city.toLowerCase())) parts.push(job.city);
  if (job.postcode && !seen.includes(job.postcode.toLowerCase())) parts.push(job.postcode);
  return parts.join(", ");
}

/**
 * When the customer wants the job done.
 *
 * `preferredDate` always carries a time component, but it's only meaningful
 * when `flexibleDate` is false — see toPreferredDateTime() in
 * components/preferred-date-picker.tsx, which stamps a 09:00 placeholder
 * whenever the customer didn't pick an arrival time. Showing that placeholder
 * as a chosen time would tell the customer something they never asked for.
 */
export function formatNeededBy(preferredDate: Date | null, flexibleDate: boolean): string {
  if (!preferredDate) return "As soon as possible";
  const date = preferredDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  if (flexibleDate) return `${date} · flexible on time`;
  const time = preferredDate.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
}
