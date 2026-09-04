import { prisma } from "@asaplocal/db";

export interface DuplicateCheckMatch {
  businessId: string;
  matchedField: "email" | "phone" | "companyRegistrationNumber";
  reason: "REJECTED_BUSINESS" | "SUSPENDED_OWNER" | "DEACTIVATED_OWNER";
}

/**
 * Looks for other businesses sharing this registrant's email, phone, or
 * company number where that business was REJECTED or its owner is now
 * SUSPENDED/DEACTIVATED — the signal for a rejected/banned provider
 * re-registering under a new account. Informational only: callers persist
 * the result for admin review rather than blocking signup, since shared
 * contact details can have innocent explanations (e.g. a family business
 * sharing a landline).
 */
export async function checkForDuplicateBusiness(params: {
  excludeBusinessId: string;
  email?: string | null;
  phone?: string | null;
  companyRegistrationNumber?: string | null;
}): Promise<DuplicateCheckMatch[]> {
  const fields: { field: DuplicateCheckMatch["matchedField"]; value: string }[] = [];
  if (params.email) fields.push({ field: "email", value: params.email });
  if (params.phone) fields.push({ field: "phone", value: params.phone });
  if (params.companyRegistrationNumber) fields.push({ field: "companyRegistrationNumber", value: params.companyRegistrationNumber });
  if (fields.length === 0) return [];

  const candidates = await prisma.business.findMany({
    where: {
      id: { not: params.excludeBusinessId },
      OR: fields.map(({ field, value }) => ({ [field]: value })),
    },
    select: {
      id: true,
      email: true,
      phone: true,
      companyRegistrationNumber: true,
      verificationStatus: true,
      owner: { select: { status: true } },
    },
  });

  const matches: DuplicateCheckMatch[] = [];
  for (const candidate of candidates) {
    const reason: DuplicateCheckMatch["reason"] | null =
      candidate.verificationStatus === "REJECTED"
        ? "REJECTED_BUSINESS"
        : candidate.owner.status === "SUSPENDED"
          ? "SUSPENDED_OWNER"
          : candidate.owner.status === "DEACTIVATED"
            ? "DEACTIVATED_OWNER"
            : null;
    if (!reason) continue;

    for (const { field, value } of fields) {
      if (candidate[field] && candidate[field] === value) {
        matches.push({ businessId: candidate.id, matchedField: field, reason });
      }
    }
  }
  return matches;
}
