import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
  typescript: true,
});

export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  PREMIUM_MONTHLY: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? "",
  LEAD_CREDIT_PACK_SMALL: process.env.STRIPE_LEAD_CREDIT_PACK_SMALL ?? "", // 5 credits
  LEAD_CREDIT_PACK_LARGE: process.env.STRIPE_LEAD_CREDIT_PACK_LARGE ?? "", // 20 credits
} as const;

export const PLAN_LEAD_ALLOWANCE: Record<"FREE" | "PRO" | "PREMIUM" | "ENTERPRISE", number> = {
  FREE: 0,
  PRO: 15,
  PREMIUM: 40,
  ENTERPRISE: 999999,
};
