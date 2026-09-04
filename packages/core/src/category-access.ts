/**
 * Gated categories — enforcement for Category.requiredBusinessTypes /
 * requiresInsuranceTypes / minTrustTier.
 *
 * Used by high-consequence categories like Builders & Renovation, where the
 * work is expensive, disruptive, and hard to undo. Deliberately gates on
 * *verified insurance and demonstrated trust* rather than company structure:
 * a large share of UK building trades are sole traders, and public liability
 * cover protects the customer far more directly than being a limited company
 * does. Leave requiredBusinessTypes empty to accept any structure.
 *
 * Unlike Category.isRegulatedTrade — which is advisory guidance shown on the
 * qualifications screen — these rules are enforced.
 */
import { prisma } from "@asaplocal/db";
import type { BusinessType, InsuranceType, TrustTier } from "@prisma/client";

const TRUST_TIER_RANK: Record<TrustTier, number> = {
  BRONZE: 0,
  SILVER: 1,
  GOLD: 2,
  PLATINUM: 3,
};

export interface CategoryGate {
  requiredBusinessTypes: BusinessType[];
  requiresInsuranceTypes: InsuranceType[];
  minTrustTier: TrustTier | null;
  minTradingMonths: number | null;
}

/** Months between a trading-start date and now — companyIncorporatedAt for limited companies, createdAt (account creation) as the best available proxy otherwise. */
function tradingMonths(since: Date): number {
  const now = new Date();
  return (now.getFullYear() - since.getFullYear()) * 12 + (now.getMonth() - since.getMonth());
}

export interface CategoryAccessResult {
  allowed: boolean;
  /** Customer-safe reasons, suitable for showing the provider directly. */
  reasons: string[];
}

const INSURANCE_LABEL: Record<string, string> = {
  PUBLIC_LIABILITY: "public liability",
  PROFESSIONAL_INDEMNITY: "professional indemnity",
  EMPLOYERS_LIABILITY: "employer's liability",
};

const BUSINESS_TYPE_LABEL: Record<string, string> = {
  SOLE_TRADER: "sole trader",
  LIMITED_COMPANY: "limited company",
  PARTNERSHIP: "partnership",
  SELF_EMPLOYED: "self-employed",
  CHARITY: "charity",
};

/** True when the category imposes no extra requirements at all. */
export function isGated(gate: CategoryGate): boolean {
  return gate.requiredBusinessTypes.length > 0 || gate.requiresInsuranceTypes.length > 0 || !!gate.minTrustTier || !!gate.minTradingMonths;
}

/**
 * Checks one business against one category's gate. Returns every failed
 * requirement rather than the first, so a provider sees the full list of what
 * they still need instead of discovering them one at a time.
 */
export async function canProvideInCategory(businessId: string, categoryId: string): Promise<CategoryAccessResult> {
  const [category, business] = await Promise.all([
    prisma.category.findUnique({
      where: { id: categoryId },
      select: { requiredBusinessTypes: true, requiresInsuranceTypes: true, minTrustTier: true, minTradingMonths: true },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      select: {
        businessType: true,
        trustTier: true,
        verificationStatus: true,
        companyIncorporatedAt: true,
        createdAt: true,
        insurancePolicies: { select: { type: true, status: true, expiryDate: true } },
      },
    }),
  ]);

  if (!category || !business) return { allowed: false, reasons: ["Business or category not found."] };

  const gate: CategoryGate = {
    requiredBusinessTypes: category.requiredBusinessTypes,
    requiresInsuranceTypes: category.requiresInsuranceTypes,
    minTrustTier: category.minTrustTier,
    minTradingMonths: category.minTradingMonths,
  };
  if (!isGated(gate)) return { allowed: true, reasons: [] };

  const reasons: string[] = [];

  // A gated category always requires a fully verified business, regardless of
  // the specific rules — search and lead matching already admit PENDING
  // businesses, which is too loose for work at this value.
  if (business.verificationStatus !== "VERIFIED") {
    reasons.push("Your business verification must be approved.");
  }

  if (gate.requiredBusinessTypes.length > 0) {
    if (!business.businessType || !gate.requiredBusinessTypes.includes(business.businessType)) {
      const allowed = gate.requiredBusinessTypes.map((t) => BUSINESS_TYPE_LABEL[t] ?? t).join(" or ");
      reasons.push(`This category is limited to ${allowed} businesses.`);
    }
  }

  for (const required of gate.requiresInsuranceTypes) {
    const held = business.insurancePolicies.find(
      (p) => p.type === required && p.status === "VERIFIED" && p.expiryDate > new Date()
    );
    if (!held) {
      reasons.push(`Verified, in-date ${INSURANCE_LABEL[required] ?? required} insurance is required.`);
    }
  }

  if (gate.minTrustTier && TRUST_TIER_RANK[business.trustTier] < TRUST_TIER_RANK[gate.minTrustTier]) {
    reasons.push(`A ${gate.minTrustTier.toLowerCase()} trust tier or above is required.`);
  }

  if (gate.minTradingMonths) {
    const since = business.companyIncorporatedAt ?? business.createdAt;
    if (tradingMonths(since) < gate.minTradingMonths) {
      reasons.push(`This category requires at least ${gate.minTradingMonths} months of trading history.`);
    }
  }

  return { allowed: reasons.length === 0, reasons };
}

/**
 * Filters a set of businesses down to those eligible for a gated category, in
 * one query rather than N. Used by lead matching, where the candidate set can
 * be large. Returns the input unchanged for ungated categories.
 */
export async function filterEligibleForCategory<T extends { id: string }>(
  businesses: T[],
  categoryId: string
): Promise<T[]> {
  if (businesses.length === 0) return businesses;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { requiredBusinessTypes: true, requiresInsuranceTypes: true, minTrustTier: true, minTradingMonths: true },
  });
  if (!category) return businesses;

  const gate: CategoryGate = {
    requiredBusinessTypes: category.requiredBusinessTypes,
    requiresInsuranceTypes: category.requiresInsuranceTypes,
    minTrustTier: category.minTrustTier,
    minTradingMonths: category.minTradingMonths,
  };
  if (!isGated(gate)) return businesses;

  const minRank = gate.minTrustTier ? TRUST_TIER_RANK[gate.minTrustTier] : 0;
  // Cutoff for minTradingMonths: since it's a fixed value for this category,
  // compute the cutoff date once rather than per-row date arithmetic —
  // companyIncorporatedAt if set, else createdAt (account creation) as the
  // best available proxy for non-limited-company businesses.
  const tradingCutoff = gate.minTradingMonths ? new Date(new Date().setMonth(new Date().getMonth() - gate.minTradingMonths)) : null;
  const eligible = await prisma.business.findMany({
    where: {
      id: { in: businesses.map((b) => b.id) },
      verificationStatus: "VERIFIED",
      ...(gate.requiredBusinessTypes.length > 0 ? { businessType: { in: gate.requiredBusinessTypes } } : {}),
      // Every required policy must be present, verified, and in date. Prisma
      // has no "matches all of" on a list, so this becomes one AND per type.
      ...(gate.requiresInsuranceTypes.length > 0
        ? {
            AND: gate.requiresInsuranceTypes.map((type) => ({
              insurancePolicies: { some: { type, status: "VERIFIED" as const, expiryDate: { gt: new Date() } } },
            })),
          }
        : {}),
      ...(tradingCutoff
        ? {
            OR: [
              { companyIncorporatedAt: { lte: tradingCutoff } },
              { companyIncorporatedAt: null, createdAt: { lte: tradingCutoff } },
            ],
          }
        : {}),
    },
    select: { id: true, trustTier: true },
  });

  const allowedIds = new Set(
    eligible.filter((b) => TRUST_TIER_RANK[b.trustTier] >= minRank).map((b) => b.id)
  );
  return businesses.filter((b) => allowedIds.has(b.id));
}
