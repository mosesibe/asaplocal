import { headers } from "next/headers";
import { auth as sessionAuth } from "./auth";
import { verifyAccessToken } from "./mobile-tokens";
import { prisma } from "@asaplocal/db";
import type { Session } from "next-auth";

/**
 * Drop-in replacement for NextAuth's `auth()` that also accepts the native
 * mobile apps' `Authorization: Bearer <access token>` header. Every existing
 * API route calls `await auth()` expecting a `Session | null` — this keeps
 * that exact contract, so no route needed to change to support mobile: the
 * cookie-based web session is checked first (unchanged behaviour), and only
 * when that's absent does it fall back to decoding a bearer token.
 */
export async function auth(): Promise<Session | null> {
  const cookieSession = await sessionAuth();
  if (cookieSession?.user) return cookieSession;

  const authHeader = (await headers()).get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const payload = await verifyAccessToken(authHeader.slice("Bearer ".length));
  if (!payload?.uid) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
    include: { business: { select: { id: true, onboardingCompletedAt: true } } },
  });
  if (!user || user.status === "SUSPENDED" || user.status === "DEACTIVATED") return null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      status: user.status,
      isEmailVerified: !!user.emailVerified,
      isPhoneVerified: !!user.phoneVerifiedAt,
      isProvider: user.role === "PROVIDER" || !!user.business || !!user.providerSince,
      hasBusiness: !!user.business,
      onboardingCompleted: !!user.business?.onboardingCompletedAt,
      phone: user.phone,
    },
    expires: new Date(payload.exp * 1000).toISOString(),
  };
}
