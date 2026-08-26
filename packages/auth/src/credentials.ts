import bcrypt from "bcryptjs";
import { prisma } from "@asaplocal/db";
import type { MobileTokenUser } from "./mobile-tokens";

/**
 * Shared email/password check used by both the web Credentials provider
 * (auth.config.ts) and the mobile login route (POST /api/mobile/auth/login)
 * — one place for the password-verify + suspended/deactivated gate.
 */
export async function verifyCredentials(email: string, password: string): Promise<MobileTokenUser | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { business: { select: { id: true } } },
  });
  if (!user?.passwordHash) return null;
  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.email,
    role: user.role,
    status: user.status,
    isEmailVerified: !!user.emailVerified,
    isPhoneVerified: !!user.phoneVerifiedAt,
    isProvider: user.role === "PROVIDER" || !!user.business || !!user.providerSince,
  };
}
