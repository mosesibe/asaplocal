import type { BusinessType } from "@asaplocal/db";

// Sole traders / self-employed providers do jobs themselves under a personal
// UTR and have no staff roster. Limited companies / partnerships / charities
// operate under a company UTR and can send staff (see StaffMember) to a job
// instead of attending in person.
const INDIVIDUAL_TYPES: BusinessType[] = ["SOLE_TRADER", "SELF_EMPLOYED"];

export function isIndividualTrader(businessType: BusinessType | null | undefined): boolean {
  return !!businessType && INDIVIDUAL_TYPES.includes(businessType);
}

export function canHaveStaff(businessType: BusinessType | null | undefined): boolean {
  return !!businessType && !INDIVIDUAL_TYPES.includes(businessType);
}

export function utrLabel(businessType: BusinessType | null | undefined): string {
  return isIndividualTrader(businessType) ? "Personal UTR (Unique Taxpayer Reference)" : "Company UTR (Unique Taxpayer Reference)";
}
