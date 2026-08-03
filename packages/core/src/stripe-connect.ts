import { stripe } from "./stripe";

/**
 * Creates a Stripe Connect Express account for a business's payouts. Bank
 * details (account holder, sort code, account number) are collected
 * entirely inside Stripe's hosted onboarding page — never touch our form
 * or database.
 */
export async function createExpressAccount(opts: { email?: string | null; businessType: "company" | "individual" }) {
  return stripe.accounts.create({
    type: "express",
    country: "GB",
    email: opts.email ?? undefined,
    business_type: opts.businessType,
    capabilities: { transfers: { requested: true } },
  });
}

export async function createAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
  return stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });
}
