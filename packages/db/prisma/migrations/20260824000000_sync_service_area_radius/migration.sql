-- Data-only fix: ServiceArea rows are seeded once at onboarding with that
-- day's baseRadiusMiles and were never kept in sync afterward, so any
-- business that later changed its Service radius on the profile page was
-- left with a stale (often wider) ServiceArea row. Lead matching and the
-- provider dashboard map both prefer a business's ServiceArea radius over
-- baseRadiusMiles when one exists, so the stale row kept surfacing leads
-- (and drawing the map circle) beyond the radius the provider had set.
-- The API now keeps these in sync going forward; this backfills existing
-- drift for businesses that already saved a profile update in the meantime.
UPDATE "ServiceArea" AS sa
SET "radiusMiles" = b."baseRadiusMiles"
FROM "Business" AS b
WHERE sa."businessId" = b.id
  AND sa."radiusMiles" != b."baseRadiusMiles";
