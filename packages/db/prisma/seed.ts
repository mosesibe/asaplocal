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

const CATEGORIES = [
  { name: "Cleaners", slug: "cleaners", icon: "sparkles" },
  { name: "Plumbers", slug: "plumbers", icon: "wrench" },
  { name: "Electricians", slug: "electricians", icon: "zap" },
  { name: "Gardeners", slug: "gardeners", icon: "leaf" },
  { name: "Handymen", slug: "handymen", icon: "hammer" },
  { name: "Movers", slug: "movers", icon: "truck" },
  { name: "Tutors", slug: "tutors", icon: "book-open" },
  { name: "Pet Sitters", slug: "pet-sitters", icon: "paw-print" },
];

const CITIES = [
  { city: "Manchester", lat: 53.4808, lng: -2.2426 },
  { city: "London", lat: 51.5072, lng: -0.1276 },
  { city: "Liverpool", lat: 53.4084, lng: -2.9916 },
  { city: "Birmingham", lat: 52.4862, lng: -1.8904 },
];

async function main() {
  console.log("Seeding AsapLocal…");

  // ── Categories ──────────────────────────────────────────────────────
  const categories = await Promise.all(
    CATEGORIES.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: {},
        create: c,
      })
    )
  );
  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

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
    { email: "sparkle.cleaning@example.com", name: "Sparkle Cleaning Co.", catSlug: "cleaners", city: "Manchester", lat: 53.4808, lng: -2.2426, plan: SubscriptionPlan.PRO, verified: true },
    { email: "flowfix.plumbing@example.com", name: "FlowFix Plumbing", catSlug: "plumbers", city: "Manchester", lat: 53.4831, lng: -2.2441, plan: SubscriptionPlan.PREMIUM, verified: true, featured: true },
    { email: "brightspark.electric@example.com", name: "BrightSpark Electrical", catSlug: "electricians", city: "Manchester", lat: 53.479, lng: -2.245, plan: SubscriptionPlan.FREE },
    { email: "greenthumb.gardens@example.com", name: "GreenThumb Gardens", catSlug: "gardeners", city: "Liverpool", lat: 53.4084, lng: -2.9916, plan: SubscriptionPlan.PRO, verified: true },
    { email: "citymove.movers@example.com", name: "CityMove Removals", catSlug: "movers", city: "London", lat: 51.5072, lng: -0.1276, plan: SubscriptionPlan.PREMIUM, verified: true, featured: true },
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
              title: `Standard ${catBySlug[b.catSlug].name.slice(0, -1)} Service`,
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
      categoryId: catBySlug["plumbers"].id,
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

  const plumber = businesses.find((b) => b.catSlug === "plumbers")!.business;
  const electrician = businesses.find((b) => b.catSlug === "electricians")!.business;

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
      categoryId: catBySlug["electricians"].id,
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
  const cleaner = businesses.find((b) => b.catSlug === "cleaners")!.business;
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
