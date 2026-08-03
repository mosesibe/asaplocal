import { prisma, type TrustTier } from "@asaplocal/db";

const TIER_ORDER: TrustTier[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];

/** True if `tier` is at or above `minTier` in the Bronze < Silver < Gold < Platinum ordering. */
export function meetsTier(tier: TrustTier, minTier: TrustTier): boolean {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(minTier);
}

async function computeTrustTier(businessId: string): Promise<TrustTier> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      identityVerification: true,
      insurancePolicies: true,
      qualifications: true,
      portfolioItems: { take: 1 },
      services: { include: { category: true } },
    },
  });
  if (!business) return "BRONZE";

  if (business.platinumOverride) return "PLATINUM";

  const identityVerified = business.identityVerification?.status === "VERIFIED";
  const businessVerified = business.verificationStatus === "VERIFIED";
  const hasVerifiedPublicLiability = business.insurancePolicies.some(
    (p) => p.type === "PUBLIC_LIABILITY" && p.status === "VERIFIED" && p.expiryDate > new Date()
  );
  const isSilver = identityVerified && businessVerified && hasVerifiedPublicLiability;
  if (!isSilver) return "BRONZE";

  const regulatedCategoryIds = new Set(business.services.filter((s) => s.category.isRegulatedTrade).map((s) => s.categoryId));
  const needsQualification = regulatedCategoryIds.size > 0;
  const hasVerifiedQualification = needsQualification
    ? business.qualifications.some((q) => q.status === "VERIFIED" && (!q.categoryId || regulatedCategoryIds.has(q.categoryId)))
    : true;
  const hasPortfolio = business.portfolioItems.length > 0;
  const isGold = hasVerifiedQualification && hasPortfolio;

  return isGold ? "GOLD" : "SILVER";
}

/** Recomputes and persists a Business's trust tier. Call after any action that changes verification status. */
export async function recomputeTrustTier(businessId: string): Promise<TrustTier> {
  const tier = await computeTrustTier(businessId);
  await prisma.business.update({ where: { id: businessId }, data: { trustTier: tier, trustTierUpdatedAt: new Date() } });
  return tier;
}

export interface Badge {
  key: string;
  label: string;
}

type BadgeableBusiness = {
  identityVerification?: { status: string } | null;
  verificationStatus: string;
  insurancePolicies?: { type: string; status: string; expiryDate: Date }[];
  qualifications?: { status: string }[];
  avgRating: number | string | { toString(): string };
  reviewCount: number;
  avgResponseMins: number | null;
};

/** Derived badges for display — not stored, computed fresh from current state. */
export function computeBadges(business: BadgeableBusiness): Badge[] {
  const badges: Badge[] = [];
  if (business.identityVerification?.status === "VERIFIED") badges.push({ key: "IDENTITY_VERIFIED", label: "Identity Verified" });
  if (business.verificationStatus === "VERIFIED") badges.push({ key: "BUSINESS_VERIFIED", label: "Business Verified" });
  const insured = (business.insurancePolicies ?? []).some((p) => p.type === "PUBLIC_LIABILITY" && p.status === "VERIFIED" && p.expiryDate > new Date());
  if (insured) badges.push({ key: "INSURED", label: "Insured" });
  if ((business.qualifications ?? []).some((q) => q.status === "VERIFIED")) badges.push({ key: "QUALIFIED_TRADE", label: "Qualified Trade" });
  if (Number(business.avgRating) >= 4.5 && business.reviewCount >= 10) badges.push({ key: "TOP_RATED", label: "Top Rated" });
  if (business.avgResponseMins != null && business.avgResponseMins <= 10) badges.push({ key: "RESPONDS_FAST", label: "Responds within 10 minutes" });
  return badges;
}
