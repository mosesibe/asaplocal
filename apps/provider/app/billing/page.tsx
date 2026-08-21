import { redirect } from "next/navigation";

/**
 * Superseded by the /earnings section. Kept as a redirect because Stripe
 * success/cancel URLs, dashboard links and any already-sent emails still point
 * here — removing it outright would 404 a provider returning from checkout.
 */
export default async function BillingRedirect({
  searchParams,
}: {
  searchParams: Promise<{ topup?: string; upgraded?: string; cancelled?: string }>;
}) {
  const { topup } = await searchParams;
  redirect(topup ? "/earnings/credits" : "/earnings/subscription");
}
