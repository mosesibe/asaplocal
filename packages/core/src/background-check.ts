import { prisma, type BackgroundCheckType } from "@asaplocal/db";

export const BACKGROUND_CHECK_TYPES: BackgroundCheckType[] = ["PERSONAL_CCJ", "BUSINESS_CCJ", "FINANCIAL", "ADVERSE_MEDIA"];

export const BACKGROUND_CHECK_LABEL: Record<BackgroundCheckType, string> = {
  PERSONAL_CCJ: "Personal CCJ check",
  BUSINESS_CCJ: "Business CCJ check",
  FINANCIAL: "Financial / bankruptcy check",
  ADVERSE_MEDIA: "Open-source & adverse-media check",
};

const NO_PROVIDER_SUMMARY = { note: "No background-check provider configured yet." };

/**
 * Ensures a BackgroundCheck row exists for every type for a business — run
 * at onboarding — so the admin review UI always has something to show
 * instead of the row not existing at all. These checks are pulled by the
 * platform, not submitted by the provider (unlike identity/insurance/etc),
 * which is why they're provisioned automatically rather than waiting on a
 * provider action.
 *
 * No vendor is contracted yet, so every row is created UNVERIFIED with an
 * explanatory resultSummary. Swap the create/update data here for a real
 * vendor call once one is picked (Creditsafe, Experian, Equifax, etc.) —
 * the model/route/admin-UI around it don't need to change.
 */
export async function ensureBackgroundChecks(businessId: string) {
  await Promise.all(
    BACKGROUND_CHECK_TYPES.map((type) =>
      prisma.backgroundCheck.upsert({
        where: { businessId_type: { businessId, type } },
        update: {},
        create: { businessId, type, resultSummary: NO_PROVIDER_SUMMARY },
      })
    )
  );
}
