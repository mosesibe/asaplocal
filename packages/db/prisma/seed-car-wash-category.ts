/**
 * Adds the Car Wash & Detailing category and its services without running
 * the full seed.
 *
 * The main seed also creates demo users, businesses and jobs, which is fine
 * locally but must never run against a shared environment. This script only
 * upserts categories, so it is safe to run anywhere.
 *
 * Ungated (no insurance/trust-tier requirement) — like Home Cleaning, this is
 * a low-physical-risk, non-structural service, not a regulated trade.
 *
 * The requested list groups services under five informal headings (Car
 * Washing, Car Detailing, Protection & Treatments, Specialist Cleaning,
 * Commercial) — the Category model is two levels deep everywhere it's
 * consumed (every category picker in the app groups by direct parentId
 * only, see apps/provider/app/services/services-manager.tsx), so those
 * headings aren't materialized as their own category rows; the sortOrder
 * below just keeps services listed in that same grouped order.
 *
 * Run with: npx tsx prisma/seed-car-wash-category.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SERVICES = [
  // Car Washing
  "Mobile car wash",
  "Exterior wash",
  "Interior clean",
  "Full car wash",
  "Mini valet",
  "Full valet",
  "Fleet washing",
  "Van washing",
  "Motorcycle washing",
  // Car Detailing
  "Full car detail",
  "Interior detailing",
  "Exterior detailing",
  "Deep interior clean",
  "Paint decontamination",
  "Clay bar treatment",
  "Machine polishing",
  "Paint correction",
  "Scratch & swirl removal",
  "Headlight restoration",
  // Protection & Treatments
  "Ceramic coating",
  "Paint sealant",
  "Waxing",
  "Leather protection",
  "Fabric protection",
  "Glass coating",
  "Alloy wheel protection",
  // Specialist Cleaning
  "Pet hair removal",
  "Stain removal",
  "Odour removal",
  "Smoke/smell treatment",
  "Mould/mildew cleaning",
  "Carpet & upholstery cleaning",
  "Convertible roof cleaning",
  // Commercial
  "Fleet cleaning",
  "Taxi/private-hire vehicle cleaning",
  "Van & commercial vehicle cleaning",
  "Dealership preparation",
  "Lease-return preparation",
  "Used-car preparation",
];

const slugify = (name: string) =>
  name.toLowerCase().replace(/&/g, "").replace(/\//g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  const parent = await prisma.category.upsert({
    where: { slug: "car-wash-detailing" },
    update: { name: "Car Wash & Detailing", icon: "car", isFeatured: false, isRegulatedTrade: false },
    create: {
      name: "Car Wash & Detailing",
      slug: "car-wash-detailing",
      icon: "car",
      isFeatured: false,
      isRegulatedTrade: false,
      sortOrder: 11,
    },
  });
  console.log(`✓ ${parent.name}`);

  for (const [i, name] of SERVICES.entries()) {
    const slug = slugify(name);
    await prisma.category.upsert({
      where: { slug },
      update: { name, parentId: parent.id },
      create: { name, slug, parentId: parent.id, sortOrder: i },
    });
    console.log(`  ✓ ${name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
