-- Redesign Studio regularly produces outdoor and exterior work (patios,
-- driveways, garden rooms, brickwork, roofing) that had no matching service,
-- so those jobs fell back to a generic parent category. Data-only migration:
-- idempotent, and skipped silently where a parent category doesn't exist.

-- Gardening & Outdoor children (ungated).
INSERT INTO "Category" ("name", "slug", "parentId", "sortOrder")
SELECT v.name, v.slug, p.id, v.sort_order
FROM (VALUES
  ('Patio & paving installation', 'patio-paving-installation', 20),
  ('Driveway installation', 'driveway-installation', 21),
  ('Garden walls & brickwork', 'garden-walls-brickwork', 22),
  ('Garden rooms & outbuildings', 'garden-rooms-outbuildings', 23),
  ('Pergolas & garden structures', 'pergolas-garden-structures', 24),
  ('Fencing & gates installation', 'fencing-gates-installation', 25),
  ('Turfing & lawn installation', 'turfing-lawn-installation', 26),
  ('Garden drainage', 'garden-drainage', 27)
) AS v(name, slug, sort_order)
CROSS JOIN "Category" p
WHERE p.slug = 'gardening'
ON CONFLICT DO NOTHING;

-- Builders & Renovation children. These copy the parent's gate so a child
-- can never become an ungated way into a gated trade.
INSERT INTO "Category" (
  "name", "slug", "parentId", "sortOrder",
  "isRegulatedTrade", "requiredBusinessTypes", "requiresInsuranceTypes", "minTrustTier", "minTradingMonths"
)
SELECT v.name, v.slug, p.id, v.sort_order,
  p."isRegulatedTrade", p."requiredBusinessTypes", p."requiresInsuranceTypes", p."minTrustTier", p."minTradingMonths"
FROM (VALUES
  ('Brickwork & masonry', 'brickwork-masonry', 20),
  ('Roofing', 'roofing', 21),
  ('Windows & doors', 'windows-doors', 22),
  ('Rendering & cladding', 'rendering-cladding', 23),
  ('Interior renovation', 'interior-renovation', 24)
) AS v(name, slug, sort_order)
CROSS JOIN "Category" p
WHERE p.slug = 'builders'
ON CONFLICT DO NOTHING;
