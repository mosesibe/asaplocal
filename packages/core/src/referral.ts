import { randomBytes } from "crypto";
import { prisma } from "@asaplocal/db";

const REWARD_PENCE = 1000; // £10 credit for both referrer and referee

function generateCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function getOrCreateReferralCode(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const updated = await prisma.user
      .update({ where: { id: userId }, data: { referralCode: code } })
      .catch(() => null);
    if (updated) return code;
  }
  throw new Error("Could not generate a unique referral code");
}

export function referralLink(code: string) {
  const base = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
  return `${base}/register?ref=${code}`;
}

/** Same code, pointed at provider signup — for tradespeople referring peers. */
export function providerReferralLink(code: string) {
  const base = process.env.NEXT_PUBLIC_PROVIDER_URL ?? "http://localhost:3001";
  return `${base}/register?ref=${code}`;
}

/** Called at signup when a `ref` code is present. No-ops silently on an invalid/self code. */
export async function recordReferral(refereeId: string, code: string) {
  const referrer = await prisma.user.findUnique({ where: { referralCode: code } });
  if (!referrer || referrer.id === refereeId) return;
  await prisma.referral
    .create({ data: { referrerId: referrer.id, refereeId, code, rewardPence: REWARD_PENCE } })
    .catch(() => {}); // refereeId is unique — ignore if a referral already exists for this user
}

/**
 * Call after a payment for `userId` is marked SUCCEEDED. If this is their
 * first successful payment and they were referred, completes the referral
 * and credits both parties.
 */
export async function completeReferralOnFirstPayment(userId: string) {
  const referral = await prisma.referral.findUnique({ where: { refereeId: userId } });
  if (!referral || referral.status === "COMPLETED") return;

  const priorPayments = await prisma.payment.count({ where: { userId, status: "SUCCEEDED" } });
  if (priorPayments !== 1) return; // this hook runs after the payment row is created, so 1 = "first"

  await prisma.$transaction([
    prisma.referral.update({ where: { id: referral.id }, data: { status: "COMPLETED", completedAt: new Date() } }),
    prisma.accountCredit.create({
      data: { userId: referral.referrerId, amountPence: referral.rewardPence, reason: "REFERRAL_REWARD", referralId: referral.id },
    }),
    prisma.accountCredit.create({
      data: { userId: referral.refereeId, amountPence: referral.rewardPence, reason: "REFERRAL_REWARD", referralId: referral.id },
    }),
  ]);
}

export async function getReferralSummary(userId: string) {
  const [code, credits, referrals] = await Promise.all([
    getOrCreateReferralCode(userId),
    prisma.accountCredit.aggregate({ where: { userId }, _sum: { amountPence: true } }),
    prisma.referral.findMany({ where: { referrerId: userId }, orderBy: { createdAt: "desc" } }),
  ]);
  return {
    code,
    link: referralLink(code),
    providerLink: providerReferralLink(code),
    rewardPence: REWARD_PENCE,
    creditBalancePence: credits._sum.amountPence ?? 0,
    referralCount: referrals.length,
    completedCount: referrals.filter((r) => r.status === "COMPLETED").length,
    pendingCount: referrals.filter((r) => r.status !== "COMPLETED").length,
  };
}
