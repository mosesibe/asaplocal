import { randomInt } from "crypto";
import { Prisma, prisma } from "@asaplocal/db";
import { sendSms } from "./sms";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** Generates and texts a 6-digit code, replacing any code already pending for this user. */
export async function sendPhoneVerificationCode(userId: string, phone: string) {
  const code = randomInt(100000, 1000000).toString();
  try {
    await prisma.$transaction([
      prisma.phoneVerificationCode.deleteMany({ where: { userId } }),
      prisma.phoneVerificationCode.create({
        data: { userId, phone, code, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
      }),
      prisma.user.update({ where: { id: userId }, data: { phone } }),
    ]);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const err = new Error("This phone number is already linked to another account.");
      (err as Error & { statusCode?: number }).statusCode = 409;
      throw err;
    }
    throw e;
  }
  await sendSms({ to: phone, body: `Your AsapLocal verification code is ${code}. It expires in 10 minutes.` });
}

export type VerifyPhoneCodeResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "too-many-attempts" | "incorrect" };

export async function verifyPhoneVerificationCode(userId: string, code: string): Promise<VerifyPhoneCodeResult> {
  const entry = await prisma.phoneVerificationCode.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (!entry || entry.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (entry.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too-many-attempts" };
  if (entry.code !== code) {
    await prisma.phoneVerificationCode.update({ where: { id: entry.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, reason: "incorrect" };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { phoneVerifiedAt: new Date() } }),
    prisma.phoneVerificationCode.deleteMany({ where: { userId } }),
  ]);
  return { ok: true };
}
