/**
 * Lead marketplace — the engine behind "customers post a job without
 * choosing a provider; providers in range buy/claim access to it".
 *
 * Lifecycle:
 *   1. Customer creates a JobRequest → createJobRequestWithLead() computes a
 *      price (£5–£250, scaling with the job's budget) and opens a Lead
 *      (status AVAILABLE).
 *   2. findEligibleProviders() matches businesses whose category + service
 *      area radius covers the job, and are active/verified.
 *   3. A provider acquires access via acquireLead():
 *        - PURCHASE: pays via Stripe (checkout session created separately;
 *          this function is invoked from the webhook once payment succeeds)
 *        - SUBSCRIPTION_ALLOWANCE: consumes this month's plan allowance
 *        - CREDIT: consumes a purchased lead-credit from the wallet
 *        - CLAIM: free first-come claim (promo / trial leads)
 *      Once `maxLeadSales` providers have acquired it, the Lead flips to
 *      LIMITED and no further acquisitions are possible.
 *   4. The provider works the lead through their own pipeline
 *      (NEW → CONTACTED → QUOTED → WON/LOST) via updateLeadPipelineStatus().
 *   5. If a lead turns out to be invalid (wrong area, spam, duplicate) the
 *      provider can requestLeadRefund(); an admin approves/rejects it via
 *      resolveLeadRefund(), which reverses the charge/credit/allowance and
 *      frees up a "slot" on the lead.
 *   6. getLeadConversionAnalytics() aggregates a business's acquired leads
 *      into a funnel + spend/ROI view for the provider dashboard.
 */
import { prisma } from "@asaplocal/db";
import type { Business, JobRequest, Lead } from "@prisma/client";
import { milesBetween, jitterLocation } from "./geo";
import { stripe, PLAN_LEAD_ALLOWANCE } from "./stripe";
import { writeAuditLog } from "./audit";
import { notify } from "./notify";
import { emailTemplates, sendEmail } from "./email";

const LEAD_PRICE_MIN_PENCE = Number(process.env.LEAD_PRICE_MIN_PENCE ?? 500);
// Price at the top of the everyday-jobs band (a £1,000 job). Jobs above that
// keep scaling — see LEAD_PRICE_CEILING_PENCE and the curve below.
const LEAD_PRICE_MAX_PENCE = Number(process.env.LEAD_PRICE_MAX_PENCE ?? 2000);
// Absolute ceiling, reached at a £50,000 job.
const LEAD_PRICE_CEILING_PENCE = Number(process.env.LEAD_PRICE_CEILING_PENCE ?? 25_000);
const DEFAULT_RADIUS_MILES = Number(process.env.LEAD_DEFAULT_RADIUS_MILES ?? 15);

/**
 * Breakpoints on the price curve: job budget midpoint (pence) → lead price
 * (pence). Interpolated linearly between adjacent points, so the curve is
 * continuous and every extra £ of job value raises the lead price a little.
 *
 *   £0       → £5        £5,000   → £60
 *   £1,000   → £20       £15,000  → £120
 *                        £50,000+ → £250
 *
 * The effective rate deliberately falls as jobs get bigger (5% → 0.5%): a
 * lead on a big renovation is worth more, but not proportionally more, and a
 * four-figure lead fee would be unsellable.
 */
const LEAD_PRICE_CURVE: { jobPence: number; leadPence: number }[] = [
  { jobPence: 0, leadPence: LEAD_PRICE_MIN_PENCE },
  { jobPence: 100_000, leadPence: LEAD_PRICE_MAX_PENCE },
  { jobPence: 500_000, leadPence: 6_000 },
  { jobPence: 1_500_000, leadPence: 12_000 },
  { jobPence: 5_000_000, leadPence: LEAD_PRICE_CEILING_PENCE },
];

/**
 * Simple, explainable pricing: scales with the job's budget midpoint along the
 * curve above. Below £1,000 this is identical to the original £5–£20 linear
 * band, so everyday maintenance leads are unaffected; above it, a £25,000
 * renovation now prices at ~£157 instead of collapsing to the old £20 cap.
 */
export function computeLeadPrice(budgetMinPence?: number | null, budgetMaxPence?: number | null): number {
  const mid = budgetMinPence && budgetMaxPence ? (budgetMinPence + budgetMaxPence) / 2 : budgetMinPence ?? budgetMaxPence ?? 10_000;
  const jobValue = Math.max(0, mid);

  // Walk the curve to find the segment this job falls in. Past the final
  // breakpoint the loop never matches and the price flattens at the ceiling.
  let leadPence = LEAD_PRICE_CEILING_PENCE;
  let lo = LEAD_PRICE_CURVE[0]!;
  for (const hi of LEAD_PRICE_CURVE.slice(1)) {
    if (jobValue <= hi.jobPence) {
      const span = hi.jobPence - lo.jobPence;
      const t = span === 0 ? 0 : (jobValue - lo.jobPence) / span;
      leadPence = lo.leadPence + t * (hi.leadPence - lo.leadPence);
      break;
    }
    lo = hi;
  }

  const clamped = Math.min(LEAD_PRICE_CEILING_PENCE, Math.max(LEAD_PRICE_MIN_PENCE, leadPence));
  return Math.round(clamped / 50) * 50; // round to nearest 50p
}

export async function createJobRequestWithLead(input: {
  customerId: string;
  categoryId: string;
  title: string;
  description: string;
  photos: string[];
  budgetMinPence?: number;
  budgetMaxPence?: number;
  preferredDate?: Date;
  flexibleDate: boolean;
  addressLine?: string;
  city: string;
  postcode?: string;
  lat: number;
  lng: number;
}) {
  const leadPricePence = computeLeadPrice(input.budgetMinPence, input.budgetMaxPence);
  const jobRequest = await prisma.jobRequest.create({
    data: {
      ...input,
      status: "MATCHING",
      leadPricePence,
      maxLeadSales: 5,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      lead: { create: { status: "AVAILABLE", radiusMiles: DEFAULT_RADIUS_MILES } },
    },
    include: { lead: true, category: true },
  });

  const eligible = await findEligibleProviders(jobRequest);
  await Promise.all(
    eligible.map((biz) =>
      notify(
        biz.ownerId,
        "NEW_LEAD",
        `New ${jobRequest.category.name.toLowerCase().slice(0, -1)} lead in ${jobRequest.city}`,
        jobRequest.title,
        `/leads/${jobRequest.lead!.id}`
      )
    )
  );
  // Fire-and-forget emails (best-effort; failures shouldn't block job creation)
  Promise.all(
    eligible.slice(0, 25).map((biz) =>
      biz.email
        ? sendEmail({
            to: biz.email,
            subject: `New lead near you: ${jobRequest.title}`,
            ...emailTemplates.newLeadAvailable(biz.name, jobRequest.title, jobRequest.city, `${process.env.NEXT_PUBLIC_PROVIDER_URL}/leads/${jobRequest.lead!.id}`),
          }).catch(() => {})
        : Promise.resolve()
    )
  ).catch(() => {});

  return jobRequest;
}

/** Category match + within the provider's service-area radius of the job. */
export async function findEligibleProviders(jobRequest: JobRequest & { category?: { id: string } }): Promise<Business[]> {
  const candidates = await prisma.business.findMany({
    where: {
      verificationStatus: { in: ["VERIFIED", "PENDING"] },
      services: { some: { categoryId: jobRequest.categoryId, isActive: true } },
    },
    include: { serviceAreas: true },
  });

  return candidates.filter((biz) =>
    biz.serviceAreas.some(
      (area) => milesBetween(Number(area.lat), Number(area.lng), Number(jobRequest.lat), Number(jobRequest.lng)) <= area.radiusMiles
    ) || milesBetween(Number(biz.lat), Number(biz.lng), Number(jobRequest.lat), Number(jobRequest.lng)) <= biz.baseRadiusMiles
  );
}

export interface NearbyLead {
  id: string;
  title: string;
  description: string;
  city: string;
  categoryName: string;
  distanceMiles: number;
  budgetMinPence: number | null;
  budgetMaxPence: number | null;
  leadPricePence: number;
  salesCount: number;
  maxLeadSales: number;
  alreadyAcquired: boolean;
  /** Approximate position only — see jitterLocation(). Never the job's true lat/lng. */
  jitteredLat: number;
  jitteredLng: number;
}

/**
 * Available leads within range of a business — same "any service area, or
 * the base radius" eligibility as findEligibleProviders() above, just
 * inverted (business → nearby leads instead of job → eligible businesses).
 * Single source of truth for both the /leads marketplace list and the
 * dashboard radar map, so the two can't disagree about what's "in range".
 */
export async function getLeadsNearBusiness(businessId: string, opts: { limit?: number } = {}): Promise<NearbyLead[]> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    // Only active services count — a paused service must stop surfacing leads
    // here, matching the `isActive: true` filter in findEligibleProviders().
    include: { serviceAreas: true, services: { where: { isActive: true }, select: { categoryId: true } } },
  });
  if (!business) return [];

  const categoryIds = [...new Set(business.services.map((s) => s.categoryId))];
  if (categoryIds.length === 0) return [];

  const candidateLeads = await prisma.lead.findMany({
    where: {
      status: "AVAILABLE",
      jobRequest: { categoryId: { in: categoryIds }, status: { in: ["OPEN", "MATCHING", "QUOTED"] } },
    },
    include: { jobRequest: { include: { category: true } }, accesses: { where: { businessId } } },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 40,
  });

  const bizLat = Number(business.lat);
  const bizLng = Number(business.lng);

  return candidateLeads
    .map((l): NearbyLead | null => {
      const jobLat = Number(l.jobRequest.lat);
      const jobLng = Number(l.jobRequest.lng);
      const inAnyServiceArea = business.serviceAreas.some(
        (area) => milesBetween(Number(area.lat), Number(area.lng), jobLat, jobLng) <= area.radiusMiles
      );
      const inBaseRadius = milesBetween(bizLat, bizLng, jobLat, jobLng) <= business.baseRadiusMiles;
      if (!inAnyServiceArea && !inBaseRadius) return null;

      const jittered = jitterLocation(jobLat, jobLng, l.id);
      return {
        id: l.id,
        title: l.jobRequest.title,
        description: l.jobRequest.description,
        city: l.jobRequest.city,
        categoryName: l.jobRequest.category.name,
        distanceMiles: milesBetween(bizLat, bizLng, jobLat, jobLng),
        budgetMinPence: l.jobRequest.budgetMinPence,
        budgetMaxPence: l.jobRequest.budgetMaxPence,
        leadPricePence: l.jobRequest.leadPricePence,
        salesCount: l.salesCount,
        maxLeadSales: l.jobRequest.maxLeadSales,
        alreadyAcquired: l.accesses.length > 0,
        jitteredLat: jittered.lat,
        jitteredLng: jittered.lng,
      };
    })
    .filter((l): l is NearbyLead => l !== null);
}

export class LeadUnavailableError extends Error {
  statusCode = 409;
}
export class LeadAlreadyAcquiredError extends Error {
  statusCode = 409;
}
export class InsufficientCreditsError extends Error {
  statusCode = 402;
}

/**
 * Acquire a lead via subscription allowance or purchased credits (fully
 * synchronous, DB-transactional — no external payment needed). Card
 * purchases instead go through Stripe Checkout; grantLeadAccess() below is
 * what the webhook calls once that payment succeeds.
 */
export async function acquireLeadWithAllowanceOrCredits(leadId: string, businessId: string) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id: leadId }, include: { jobRequest: true } });
    if (!lead || lead.status !== "AVAILABLE") throw new LeadUnavailableError("Lead is no longer available");

    const existing = await tx.leadAccess.findUnique({ where: { leadId_businessId: { leadId, businessId } } });
    if (existing) throw new LeadAlreadyAcquiredError("You already have access to this lead");

    const subscription = await tx.subscription.findUnique({ where: { businessId } });
    const wallet = await tx.leadCreditWallet.findUnique({ where: { businessId } });

    let acquisitionType: "SUBSCRIPTION_ALLOWANCE" | "CREDIT";
    if (subscription && subscription.status === "ACTIVE" && subscription.leadAllowanceUsed < subscription.monthlyLeadAllowance) {
      acquisitionType = "SUBSCRIPTION_ALLOWANCE";
      await tx.subscription.update({ where: { businessId }, data: { leadAllowanceUsed: { increment: 1 } } });
    } else if (wallet && wallet.balance > 0) {
      acquisitionType = "CREDIT";
      await tx.leadCreditWallet.update({ where: { businessId }, data: { balance: { decrement: 1 } } });
    } else {
      throw new InsufficientCreditsError("No subscription allowance or lead credits remaining — purchase this lead or top up credits.");
    }

    const access = await tx.leadAccess.create({
      data: { leadId, businessId, acquisitionType, pricePaidPence: 0, creditsSpent: acquisitionType === "CREDIT" ? 1 : 0 },
    });

    if (acquisitionType === "CREDIT" && wallet) {
      await tx.leadCreditTransaction.create({
        data: { walletId: wallet.id, type: "SPEND", amount: -1, leadAccessId: access.id, description: `Spent on lead ${leadId}` },
      });
    }

    const salesCount = lead.salesCount + 1;
    await tx.lead.update({
      where: { id: leadId },
      data: { salesCount, status: salesCount >= lead.jobRequest.maxLeadSales ? "LIMITED" : "AVAILABLE" },
    });

    return access;
  });
}

/** Called by the Stripe webhook once a lead-purchase PaymentIntent succeeds. */
export async function grantPurchasedLeadAccess(leadId: string, businessId: string, pricePaidPence: number, stripePaymentIntentId: string) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUniqueOrThrow({ where: { id: leadId }, include: { jobRequest: true } });

    const access = await tx.leadAccess.upsert({
      where: { leadId_businessId: { leadId, businessId } },
      update: {},
      create: { leadId, businessId, acquisitionType: "PURCHASE", pricePaidPence, status: "NEW" },
    });

    await tx.payment.create({
      data: {
        userId: (await tx.business.findUniqueOrThrow({ where: { id: businessId } })).ownerId,
        businessId,
        leadAccessId: access.id,
        type: "LEAD_PURCHASE",
        status: "SUCCEEDED",
        amountPence: pricePaidPence,
        stripePaymentIntentId,
      },
    });

    const salesCount = lead.salesCount + 1;
    await tx.lead.update({
      where: { id: leadId },
      data: { salesCount, status: salesCount >= lead.jobRequest.maxLeadSales ? "LIMITED" : "AVAILABLE" },
    });

    return access;
  });
}

export async function updateLeadPipelineStatus(leadAccessId: string, status: "CONTACTED" | "QUOTED" | "WON" | "LOST", lostReason?: string) {
  const timestampField =
    status === "CONTACTED" ? "contactedAt" : status === "QUOTED" ? "quotedAt" : status === "WON" ? "wonAt" : "lostAt";
  return prisma.leadAccess.update({
    where: { id: leadAccessId },
    data: { status, [timestampField]: new Date(), ...(status === "LOST" ? { lostReason } : {}) },
  });
}

// ── Refunds for invalid leads ────────────────────────────────────────────

export async function requestLeadRefund(leadAccessId: string, requestedById: string, reason: string, details?: string) {
  const access = await prisma.leadAccess.findUniqueOrThrow({ where: { id: leadAccessId } });
  if (access.isRefunded) throw Object.assign(new Error("Already refunded"), { statusCode: 409 });
  return prisma.refundRequest.create({
    data: { leadAccessId, requestedById, reason: reason as any, details, status: "PENDING" },
  });
}

export async function resolveLeadRefund(refundRequestId: string, reviewedById: string, decision: "APPROVED" | "REJECTED", reviewNote?: string) {
  return prisma.$transaction(async (tx) => {
    const refundReq = await tx.refundRequest.findUniqueOrThrow({
      where: { id: refundRequestId },
      include: { leadAccess: { include: { lead: true, business: true } } },
    });

    await tx.refundRequest.update({
      where: { id: refundRequestId },
      data: { status: decision, reviewedById, reviewedAt: new Date(), reviewNote, refundAmountPence: refundReq.leadAccess.pricePaidPence },
    });

    if (decision === "REJECTED") return refundReq;

    const { leadAccess } = refundReq;
    await tx.leadAccess.update({ where: { id: leadAccess.id }, data: { isRefunded: true, status: "LOST", lostReason: "Refunded — invalid lead" } });

    // Reverse whatever payment method was used
    if (leadAccess.acquisitionType === "PURCHASE" && leadAccess.pricePaidPence > 0) {
      const payment = await tx.payment.findUnique({ where: { leadAccessId: leadAccess.id } });
      if (payment?.stripePaymentIntentId) {
        await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
      }
      if (payment) {
        await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED", refundedAmountPence: payment.amountPence } });
      }
    } else if (leadAccess.acquisitionType === "CREDIT") {
      const wallet = await tx.leadCreditWallet.findUniqueOrThrow({ where: { businessId: leadAccess.businessId } });
      await tx.leadCreditWallet.update({ where: { id: wallet.id }, data: { balance: { increment: 1 } } });
      await tx.leadCreditTransaction.create({
        data: { walletId: wallet.id, type: "REFUND", amount: 1, description: `Refund for lead access ${leadAccess.id}` },
      });
    } else if (leadAccess.acquisitionType === "SUBSCRIPTION_ALLOWANCE") {
      await tx.subscription.update({ where: { businessId: leadAccess.businessId }, data: { leadAllowanceUsed: { decrement: 1 } } });
    }

    // Free up a marketplace slot again
    await tx.lead.update({
      where: { id: leadAccess.leadId },
      data: { salesCount: { decrement: 1 }, status: "AVAILABLE" },
    });

    await writeAuditLog({
      actorId: reviewedById,
      actorRole: "ADMIN",
      action: "lead.refund.approve",
      targetType: "LeadAccess",
      targetId: leadAccess.id,
      metadata: { reason: refundReq.reason, refundAmountPence: leadAccess.pricePaidPence },
    });

    await notify(
      (await tx.business.findUniqueOrThrow({ where: { id: leadAccess.businessId } })).ownerId,
      "REFUND_PROCESSED",
      "Lead refund approved",
      "Your lead credit/payment has been refunded.",
    );

    return refundReq;
  });
}

// ── Analytics ─────────────────────────────────────────────────────────

export async function getLeadConversionAnalytics(businessId: string) {
  const accesses = await prisma.leadAccess.findMany({ where: { businessId }, include: { lead: { include: { jobRequest: true } } } });

  const total = accesses.length;
  const byStatus = { NEW: 0, CONTACTED: 0, QUOTED: 0, WON: 0, LOST: 0 };
  let totalSpendPence = 0;
  let wonRevenuePence = 0;
  let contactedCount = 0;
  let totalTimeToContactMs = 0;

  for (const a of accesses) {
    byStatus[a.status as keyof typeof byStatus]++;
    totalSpendPence += a.pricePaidPence;
    if (a.contactedAt) {
      contactedCount++;
      totalTimeToContactMs += a.contactedAt.getTime() - a.createdAt.getTime();
    }
    if (a.status === "WON") {
      wonRevenuePence += a.lead.jobRequest.budgetMaxPence ?? a.lead.jobRequest.budgetMinPence ?? 0;
    }
  }

  const conversionRate = total > 0 ? byStatus.WON / total : 0;
  const avgTimeToContactMins = contactedCount > 0 ? Math.round(totalTimeToContactMs / contactedCount / 60000) : null;
  const roi = totalSpendPence > 0 ? (wonRevenuePence - totalSpendPence) / totalSpendPence : null;

  return {
    total,
    byStatus,
    conversionRate,
    totalSpendPence,
    wonRevenuePence,
    avgTimeToContactMins,
    roi,
  };
}

const EARNING_PAYMENT_TYPES = ["BOOKING_DEPOSIT", "BOOKING_FULL", "BOOKING_BALANCE"] as const;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * "Earnings" = money the business actually earned from booked jobs
 * (BOOKING_DEPOSIT/BOOKING_FULL), not what it spent acquiring leads
 * (LEAD_PURCHASE/LEAD_CREDIT_TOPUP/SUBSCRIPTION are costs, not earnings).
 */
export async function getEarningsSummary(businessId: string) {
  const weekStart = startOfWeek(new Date());

  const [weekPayments, allTimeAgg] = await Promise.all([
    prisma.payment.findMany({
      where: { businessId, status: "SUCCEEDED", type: { in: [...EARNING_PAYMENT_TYPES] }, createdAt: { gte: weekStart } },
      select: { amountPence: true, createdAt: true },
    }),
    prisma.payment.aggregate({
      where: { businessId, status: "SUCCEEDED", type: { in: [...EARNING_PAYMENT_TYPES] } },
      _sum: { amountPence: true },
    }),
  ]);

  const dailyBreakdown: { date: string; amountPence: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const amountPence = weekPayments
      .filter((p) => p.createdAt.toISOString().slice(0, 10) === dateStr)
      .reduce((sum, p) => sum + p.amountPence, 0);
    dailyBreakdown.push({ date: dateStr, amountPence });
  }

  return {
    weekTotalPence: dailyBreakdown.reduce((sum, d) => sum + d.amountPence, 0),
    allTimePence: allTimeAgg._sum.amountPence ?? 0,
    dailyBreakdown,
  };
}

export async function grantMonthlyAllowance(businessId: string, plan: keyof typeof PLAN_LEAD_ALLOWANCE) {
  await prisma.subscription.update({
    where: { businessId },
    data: { monthlyLeadAllowance: PLAN_LEAD_ALLOWANCE[plan], leadAllowanceUsed: 0 },
  });
}
