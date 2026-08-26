/**
 * Adds the Builders & Renovation trades (and the landscaping category the
 * Redesign Studio maps garden work to) without running the full seed.
 *
 * The main seed also creates demo users, businesses and jobs, which is fine
 * locally but must never run against a shared environment. This script only
 * upserts categories, so it is safe to run anywhere.
 *
 * Run with: npx tsx prisma/seed-builders-category.ts
 */
import { PrismaClient, InsuranceType, TrustTier } from "@prisma/client";

const prisma = new PrismaClient();

// Gated on verified public liability insurance and a SILVER+ trust tier rather
// than company structure — plenty of excellent UK builders are sole traders,
// and insurance is what actually protects the customer.
const GATE = {
  requiredBusinessTypes: [],
  requiresInsuranceTypes: [InsuranceType.PUBLIC_LIABILITY],
  minTrustTier: TrustTier.SILVER,
};

const BUILDER_CHILDREN = [
  "Kitchen fitting",
  "Bathroom fitting",
  "Loft conversion",
  "Garage conversion",
  "Home extensions",
  "Carpentry & joinery",
  "Plastering",
  "Tiling",
  "Flooring installation",
  "Structural work",
];

const slugify = (name: string) =>
  name.toLowerCase().replace(/&/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  const builders = await prisma.category.upsert({
    where: { slug: "builders" },
    update: { name: "Builders & Renovation", icon: "hammer", isFeatured: true, isRegulatedTrade: true, ...GATE },
    create: {
      name: "Builders & Renovation",
      slug: "builders",
      icon: "hammer",
      isFeatured: true,
      isRegulatedTrade: true,
      suggestedQualifications: ["FMB", "TrustMark", "NVQ Construction", "CSCS Card"],
      sortOrder: 3,
      ...GATE,
    },
  });
  console.log(`✓ ${builders.name}`);

  for (const [i, name] of BUILDER_CHILDREN.entries()) {
    // Children inherit the parent's gate — providers list services against the
    // child, so an ungated child would be a hole straight through the gate.
    const slug = slugify(name);
    await prisma.category.upsert({
      where: { slug },
      update: { name, parentId: builders.id, ...GATE },
      create: { name, slug, parentId: builders.id, sortOrder: i, ...GATE },
    });
    console.log(`  ✓ ${name}`);
  }

  const gardening = await prisma.category.findUnique({ where: { slug: "gardening" } });
  if (gardening) {
    await prisma.category.upsert({
      where: { slug: "garden-design-landscaping" },
      update: { name: "Garden design & landscaping", parentId: gardening.id },
      create: { name: "Garden design & landscaping", slug: "garden-design-landscaping", parentId: gardening.id, sortOrder: 0 },
    });
    console.log("✓ Garden design & landscaping");
  } else {
    console.warn("! 'gardening' category not found — skipped landscaping child");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
