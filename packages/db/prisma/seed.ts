/**
 * AsapLocal seed data.
 * Run with: pnpm db:seed
 *
 * Creates: categories, an admin, a dispatcher, customers, providers with
 * businesses/services/subscriptions, a couple of open job requests with
 * leads + lead access records in different states, a completed booking with
 * a review, and a lead credit wallet — enough to exercise every core flow
 * (search, quote, lead marketplace, dispatcher approval, reviews) locally.
 */
import { PrismaClient, Role, VerificationStatus, SubscriptionPlan, SubscriptionStatus, LeadStatus, LeadAcquisitionType, ProviderLeadStatus, BookingStatus, ReviewStatus, JobRequestStatus, PriceType } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

interface CategoryDef {
  name: string;
  slug: string;
  icon: string;
  isFeatured?: boolean;
  children: { name: string; slug: string; isEmergency?: boolean }[];
}

// Phase-1 launch categories (isFeatured) per the "best categories to launch
// first" analysis: highest search demand + repeat-booking rate.
const CATEGORIES: CategoryDef[] = [
  {
    name: "Home Cleaning",
    slug: "cleaning",
    icon: "sparkles",
    isFeatured: true,
    children: [
      { name: "Regular house cleaning", slug: "regular-house-cleaning" },
      { name: "Deep cleaning", slug: "deep-cleaning" },
      { name: "End-of-tenancy cleaning", slug: "end-of-tenancy-cleaning" },
      { name: "Carpet cleaning", slug: "carpet-cleaning" },
      { name: "Upholstery cleaning", slug: "upholstery-cleaning" },
      { name: "Window cleaning", slug: "window-cleaning" },
      { name: "Oven cleaning", slug: "oven-cleaning" },
      { name: "After-party cleaning", slug: "after-party-cleaning" },
      { name: "Airbnb / holiday-let cleaning", slug: "airbnb-cleaning" },
      { name: "Office cleaning", slug: "office-cleaning" },
    ],
  },
  {
    name: "Plumbing",
    slug: "plumbing",
    icon: "wrench",
    isFeatured: true,
    children: [
      { name: "Emergency plumbing", slug: "emergency-plumbing", isEmergency: true },
      { name: "Leak repair", slug: "leak-repair", isEmergency: true },
      { name: "Tap replacement", slug: "tap-replacement" },
      { name: "Toilet repair", slug: "toilet-repair" },
      { name: "Shower installation", slug: "shower-installation" },
      { name: "Pipe repair", slug: "pipe-repair" },
      { name: "Radiator installation", slug: "radiator-installation" },
      { name: "Boiler pressure issues", slug: "boiler-pressure-issues", isEmergency: true },
      { name: "Drain unblocking", slug: "drain-unblocking", isEmergency: true },
      { name: "Bathroom plumbing", slug: "bathroom-plumbing" },
    ],
  },
  {
    name: "Electrical",
    slug: "electrical",
    icon: "zap",
    isFeatured: true,
    children: [
      { name: "Emergency electrician", slug: "emergency-electrician", isEmergency: true },
      { name: "Light fitting installation", slug: "light-fitting-installation" },
      { name: "Socket installation", slug: "socket-installation" },
      { name: "Consumer unit (fuse box) upgrades", slug: "consumer-unit-upgrades" },
      { name: "Fault finding", slug: "fault-finding" },
      { name: "Rewiring", slug: "rewiring" },
      { name: "Outdoor lighting", slug: "outdoor-lighting" },
      { name: "EV charger installation", slug: "ev-charger-installation" },
      { name: "Smoke alarm installation", slug: "smoke-alarm-installation" },
      { name: "Appliance connection", slug: "appliance-connection" },
    ],
  },
  {
    name: "Gardening & Outdoor",
    slug: "gardening",
    icon: "leaf",
    isFeatured: true,
    children: [
      { name: "Lawn mowing", slug: "lawn-mowing" },
      { name: "Hedge trimming", slug: "hedge-trimming" },
      { name: "Weeding", slug: "weeding" },
      { name: "Garden clearance", slug: "garden-clearance" },
      { name: "Pressure washing", slug: "pressure-washing" },
      { name: "Fence repair", slug: "fence-repair" },
      { name: "Decking installation", slug: "decking-installation" },
      { name: "Patio cleaning", slug: "patio-cleaning" },
      { name: "Tree pruning", slug: "tree-pruning" },
      { name: "Artificial grass installation", slug: "artificial-grass-installation" },
    ],
  },
  {
    name: "Handyman",
    slug: "handyman",
    icon: "hammer",
    isFeatured: true,
    children: [
      { name: "Flat-pack furniture assembly", slug: "flat-pack-furniture-assembly" },
      { name: "TV wall mounting", slug: "tv-wall-mounting" },
      { name: "Shelf installation", slug: "shelf-installation" },
      { name: "Curtain & blind fitting", slug: "curtain-blind-fitting" },
      { name: "Door repairs", slug: "door-repairs" },
      { name: "Lock replacement", slug: "lock-replacement" },
      { name: "Minor plaster repairs", slug: "minor-plaster-repairs" },
      { name: "Picture hanging", slug: "picture-hanging" },
      { name: "Silicone sealing", slug: "silicone-sealing" },
      { name: "General odd jobs", slug: "general-odd-jobs" },
    ],
  },
  {
    name: "Painting & Decorating",
    slug: "painting",
    icon: "paint-roller",
    children: [
      { name: "Interior painting", slug: "interior-painting" },
      { name: "Exterior painting", slug: "exterior-painting" },
      { name: "Wallpaper installation", slug: "wallpaper-installation" },
      { name: "Wallpaper removal", slug: "wallpaper-removal" },
      { name: "Ceiling painting", slug: "ceiling-painting" },
      { name: "Woodwork painting", slug: "woodwork-painting" },
      { name: "Touch-up repairs", slug: "touch-up-repairs" },
      { name: "Fence painting", slug: "fence-painting" },
      { name: "Commercial decorating", slug: "commercial-decorating" },
      { name: "Feature wall decorating", slug: "feature-wall-decorating" },
    ],
  },
  {
    name: "Removals & Moving",
    slug: "removals",
    icon: "truck",
    children: [
      { name: "House removals", slug: "house-removals" },
      { name: "Flat removals", slug: "flat-removals" },
      { name: "Man with a van", slug: "man-with-a-van" },
      { name: "Furniture moving", slug: "furniture-moving" },
      { name: "Packing services", slug: "packing-services" },
      { name: "Unpacking services", slug: "unpacking-services" },
      { name: "Office relocation", slug: "office-relocation" },
      { name: "Student moves", slug: "student-moves" },
      { name: "Storage collection", slug: "storage-collection" },
      { name: "Single-item delivery", slug: "single-item-delivery" },
    ],
  },
  {
    name: "Tutoring",
    slug: "tutoring",
    icon: "book-open",
    children: [
      { name: "Maths tutoring", slug: "maths-tutoring" },
      { name: "English tutoring", slug: "english-tutoring" },
      { name: "Science tutoring", slug: "science-tutoring" },
      { name: "GCSE preparation", slug: "gcse-preparation" },
      { name: "A-level preparation", slug: "a-level-preparation" },
      { name: "Primary school support", slug: "primary-school-support" },
      { name: "University tutoring", slug: "university-tutoring" },
      { name: "Online tutoring", slug: "online-tutoring" },
      { name: "Music lessons", slug: "music-lessons" },
      { name: "Language lessons", slug: "language-lessons" },
    ],
  },
  {
    name: "Beauty & Wellness",
    slug: "beauty",
    icon: "scissors",
    children: [
      { name: "Mobile hairdresser", slug: "mobile-hairdresser" },
      { name: "Barber services", slug: "barber-services" },
      { name: "Makeup artist", slug: "makeup-artist" },
      { name: "Nail technician", slug: "nail-technician" },
      { name: "Eyebrow & lash services", slug: "eyebrow-lash-services" },
      { name: "Massage therapy", slug: "massage-therapy" },
      { name: "Personal training", slug: "personal-training" },
      { name: "Yoga instruction", slug: "yoga-instruction" },
      { name: "Spray tanning", slug: "spray-tanning" },
      { name: "Bridal beauty services", slug: "bridal-beauty-services" },
    ],
  },
  {
    name: "Pet Services",
    slug: "pet-services",
    icon: "paw-print",
    children: [
      { name: "Dog walking", slug: "dog-walking" },
      { name: "Pet sitting", slug: "pet-sitting" },
      { name: "Cat sitting", slug: "cat-sitting" },
      { name: "Dog grooming", slug: "dog-grooming" },
      { name: "Puppy visits", slug: "puppy-visits" },
      { name: "Overnight pet care", slug: "overnight-pet-care" },
      { name: "Pet transport", slug: "pet-transport" },
      { name: "Feeding visits", slug: "feeding-visits" },
      { name: "Small animal care", slug: "small-animal-care" },
      { name: "Pet exercise sessions", slug: "pet-exercise-sessions" },
    ],
  },
];

// Old flat 8-category slug scheme this taxonomy replaces. Renaming (rather
// than re-inserting under the new slug) preserves the row's id so existing
// Business/Service/JobRequest foreign keys stay valid.
const LEGACY_SLUG_RENAMES: Record<string, string> = {
  cleaners: "cleaning",
  plumbers: "plumbing",
  electricians: "electrical",
  gardeners: "gardening",
  handymen: "handyman",
  movers: "removals",
  tutors: "tutoring",
  "pet-sitters": "pet-services",
};

const CITIES = [
  { city: "Manchester", lat: 53.4808, lng: -2.2426 },
  { city: "London", lat: 51.5072, lng: -0.1276 },
  { city: "Liverpool", lat: 53.4084, lng: -2.9916 },
  { city: "Birmingham", lat: 52.4862, lng: -1.8904 },
];

async function main() {
  console.log("Seeding AsapLocal…");

  // ── Categories ──────────────────────────────────────────────────────
  for (const [oldSlug, newSlug] of Object.entries(LEGACY_SLUG_RENAMES)) {
    const existing = await prisma.category.findUnique({ where: { slug: oldSlug } });
    if (existing) {
      const def = CATEGORIES.find((c) => c.slug === newSlug)!;
      await prisma.category.update({ where: { id: existing.id }, data: { slug: newSlug, name: def.name, icon: def.icon } });
    }
  }

  const parentCategories = await Promise.all(
    CATEGORIES.map((c, i) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: { name: c.name, icon: c.icon, isFeatured: !!c.isFeatured, sortOrder: i },
        create: { name: c.name, slug: c.slug, icon: c.icon, isFeatured: !!c.isFeatured, sortOrder: i },
      })
    )
  );
  const catBySlug = Object.fromEntries(parentCategories.map((c) => [c.slug, c]));

  const childCategories = [];
  for (const c of CATEGORIES) {
    const parent = catBySlug[c.slug];
    for (const [i, child] of c.children.entries()) {
      const row = await prisma.category.upsert({
        where: { slug: child.slug },
        update: { name: child.name, parentId: parent.id, isEmergency: !!child.isEmergency, sortOrder: i },
        create: { name: child.name, slug: child.slug, parentId: parent.id, isEmergency: !!child.isEmergency, sortOrder: i },
      });
      childCategories.push(row);
    }
  }
  const categories = [...parentCategories, ...childCategories];

  // ── Admin ───────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@asaplocal.app" },
    update: {},
    create: {
      email: "admin@asaplocal.app",
      role: Role.ADMIN,
      status: "ACTIVE",
      emailVerified: new Date(),
      profile: { create: { firstName: "Ava", lastName: "Admin", city: "Manchester", country: "GB" } },
    },
  });

  // ── Dispatcher ──────────────────────────────────────────────────────
  const dispatcher = await prisma.user.upsert({
    where: { email: "dispatcher@asaplocal.app" },
    update: {},
    create: {
      email: "dispatcher@asaplocal.app",
      role: Role.DISPATCHER,
      status: "ACTIVE",
      emailVerified: new Date(),
      profile: { create: { firstName: "Dan", lastName: "Dispatch", city: "Manchester", country: "GB" } },
    },
  });

  // ── Customers ───────────────────────────────────────────────────────
  const customer1 = await prisma.user.upsert({
    where: { email: "customer1@example.com" },
    update: {},
    create: {
      email: "customer1@example.com",
      role: Role.CUSTOMER,
      status: "ACTIVE",
      emailVerified: new Date(),
      profile: { create: { firstName: "Priya", lastName: "Shah", city: "Manchester", country: "GB", lat: 53.4808, lng: -2.2426 } },
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: "customer2@example.com" },
    update: {},
    create: {
      email: "customer2@example.com",
      role: Role.CUSTOMER,
      status: "ACTIVE",
      emailVerified: new Date(),
      profile: { create: { firstName: "Tom", lastName: "Baker", city: "London", country: "GB", lat: 51.5072, lng: -0.1276 } },
    },
  });

  // ── Providers (businesses) ─────────────────────────────────────────
  type SeedBiz = { email: string; name: string; catSlug: string; city: string; lat: number; lng: number; plan: SubscriptionPlan; verified?: boolean; featured?: boolean };
  const seedBusinesses: SeedBiz[] = [
    { email: "sparkle.cleaning@example.com", name: "Sparkle Cleaning Co.", catSlug: "cleaning", city: "Manchester", lat: 53.4808, lng: -2.2426, plan: SubscriptionPlan.PRO, verified: true },
    { email: "flowfix.plumbing@example.com", name: "FlowFix Plumbing", catSlug: "plumbing", city: "Manchester", lat: 53.4831, lng: -2.2441, plan: SubscriptionPlan.PREMIUM, verified: true, featured: true },
    { email: "brightspark.electric@example.com", name: "BrightSpark Electrical", catSlug: "electrical", city: "Manchester", lat: 53.479, lng: -2.245, plan: SubscriptionPlan.FREE },
    { email: "greenthumb.gardens@example.com", name: "GreenThumb Gardens", catSlug: "gardening", city: "Liverpool", lat: 53.4084, lng: -2.9916, plan: SubscriptionPlan.PRO, verified: true },
    { email: "citymove.movers@example.com", name: "CityMove Removals", catSlug: "removals", city: "London", lat: 51.5072, lng: -0.1276, plan: SubscriptionPlan.PREMIUM, verified: true, featured: true },
  ];

  const businesses = [];
  for (const b of seedBusinesses) {
    const owner = await prisma.user.upsert({
      where: { email: b.email },
      update: {},
      create: {
        email: b.email,
        role: Role.PROVIDER,
        status: "ACTIVE",
        emailVerified: new Date(),
        profile: { create: { firstName: b.name.split(" ")[0], lastName: "Owner", city: b.city, country: "GB", lat: b.lat, lng: b.lng } },
      },
    });

    const business = await prisma.business.upsert({
      where: { ownerId: owner.id },
      update: {},
      create: {
        ownerId: owner.id,
        name: b.name,
        slug: b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        description: `${b.name} — trusted, insured local ${catBySlug[b.catSlug].name.toLowerCase()} serving ${b.city} and surrounding areas.`,
        city: b.city,
        lat: b.lat,
        lng: b.lng,
        country: "GB",
        baseRadiusMiles: 15,
        insured: true,
        verificationStatus: b.verified ? VerificationStatus.VERIFIED : VerificationStatus.PENDING,
        verifiedAt: b.verified ? new Date() : null,
        avgRating: 4.6,
        reviewCount: 12,
        completedJobsCount: 48,
        responseRatePct: 92,
        avgResponseMins: 35,
        isFeatured: !!b.featured,
        featuredUntil: b.featured ? new Date(Date.now() + 30 * 24 * 3600 * 1000) : null,
        serviceAreas: { create: [{ city: b.city, lat: b.lat, lng: b.lng, radiusMiles: 15 }] },
        services: {
          create: [
            {
              categoryId: catBySlug[b.catSlug].id,
              title: `Standard ${catBySlug[b.catSlug].name} Service`,
              description: "Standard call-out, diagnostics and same-day completion where possible.",
              priceType: PriceType.HOURLY,
              priceMinPence: 3500,
              priceMaxPence: 8000,
              durationMins: 90,
              images: [],
            },
          ],
        },
        subscription: {
          create: {
            plan: b.plan,
            status: SubscriptionStatus.ACTIVE,
            monthlyLeadAllowance: b.plan === SubscriptionPlan.PREMIUM ? 40 : b.plan === SubscriptionPlan.PRO ? 15 : 0,
            leadAllowanceUsed: 0,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          },
        },
        leadCreditWallet: { create: { balance: b.plan === SubscriptionPlan.FREE ? 2 : 5 } },
      },
    });
    businesses.push({ business, catSlug: b.catSlug });
  }

  // ── Open job requests (no provider chosen) → generate Leads ─────────
  const jr1 = await prisma.jobRequest.create({
    data: {
      customerId: customer1.id,
      categoryId: catBySlug["plumbing"].id,
      title: "Leaking kitchen tap needs urgent repair",
      description: "Tap has been dripping constantly for 2 days, water pooling under the sink cabinet.",
      photos: [],
      budgetMinPence: 4000,
      budgetMaxPence: 12000,
      preferredDate: new Date(Date.now() + 2 * 24 * 3600 * 1000),
      city: "Manchester",
      lat: 53.4808,
      lng: -2.2426,
      status: JobRequestStatus.MATCHING,
      maxLeadSales: 5,
      leadPricePence: 800,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      lead: {
        create: {
          status: LeadStatus.AVAILABLE,
          radiusMiles: 15,
          viewCount: 3,
        },
      },
    },
    include: { lead: true },
  });

  const plumber = businesses.find((b) => b.catSlug === "plumbing")!.business;
  const electrician = businesses.find((b) => b.catSlug === "electrical")!.business;

  // FlowFix purchases the lead outright (£8 lead)
  await prisma.leadAccess.create({
    data: {
      leadId: jr1.lead!.id,
      businessId: plumber.id,
      acquisitionType: LeadAcquisitionType.PURCHASE,
      pricePaidPence: 800,
      status: ProviderLeadStatus.CONTACTED,
      contactedAt: new Date(),
    },
  });
  await prisma.lead.update({ where: { id: jr1.lead!.id }, data: { salesCount: { increment: 1 } } });

  const jr2 = await prisma.jobRequest.create({
    data: {
      customerId: customer2.id,
      categoryId: catBySlug["electrical"].id,
      title: "Rewire two bedrooms and add new sockets",
      description: "Victorian terrace, need an assessment and quote for rewiring two upstairs bedrooms plus 4 new sockets.",
      photos: [],
      budgetMinPence: 30000,
      budgetMaxPence: 80000,
      preferredDate: null,
      flexibleDate: true,
      city: "London",
      lat: 51.5072,
      lng: -0.1276,
      status: JobRequestStatus.OPEN,
      maxLeadSales: 5,
      leadPricePence: 1500,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      lead: { create: { status: LeadStatus.AVAILABLE, radiusMiles: 20 } },
    },
    include: { lead: true },
  });

  // BrightSpark uses subscription allowance to claim (even though out of city, demonstrates flow)
  await prisma.leadAccess.create({
    data: {
      leadId: jr2.lead!.id,
      businessId: electrician.id,
      acquisitionType: LeadAcquisitionType.SUBSCRIPTION_ALLOWANCE,
      pricePaidPence: 0,
      status: ProviderLeadStatus.NEW,
    },
  });
  await prisma.lead.update({ where: { id: jr2.lead!.id }, data: { salesCount: { increment: 1 } } });

  // ── A completed booking with a review (Sparkle Cleaning) ────────────
  const cleaner = businesses.find((b) => b.catSlug === "cleaning")!.business;
  const cleanerService = await prisma.service.findFirstOrThrow({ where: { businessId: cleaner.id } });

  const booking = await prisma.booking.create({
    data: {
      customerId: customer1.id,
      businessId: cleaner.id,
      serviceId: cleanerService.id,
      scheduledDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      status: BookingStatus.COMPLETED,
      totalAmountPence: 6000,
      depositAmountPence: 1500,
      addressLine: "12 Oak Street",
      city: "Manchester",
      postcode: "M1 4BT",
      completedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    },
  });

  await prisma.review.create({
    data: {
      bookingId: booking.id,
      authorId: customer1.id,
      businessId: cleaner.id,
      rating: 5,
      comment: "Brilliant job, on time and very thorough. Would book again.",
      photos: [],
      status: ReviewStatus.PUBLISHED,
    },
  });

  await prisma.payment.create({
    data: {
      userId: customer1.id,
      businessId: cleaner.id,
      bookingId: booking.id,
      type: "BOOKING_FULL",
      status: "SUCCEEDED",
      amountPence: 6000,
      stripePaymentIntentId: `pi_seed_${randomUUID().slice(0, 8)}`,
    },
  });

  console.log("Seed complete:");
  console.log(`  categories: ${categories.length}`);
  console.log(`  businesses: ${businesses.length}`);
  console.log(`  admin login:      admin@asaplocal.app`);
  console.log(`  dispatcher login: dispatcher@asaplocal.app`);
  console.log(`  customer logins:  customer1@example.com, customer2@example.com`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
