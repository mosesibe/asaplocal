import { encode, decode } from "next-auth/jwt";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@asaplocal/db";
import type { Role, UserStatus } from "@prisma/client";

// Bearer-token auth for the native mobile apps (Expo), which can't rely on
// the cookie-based session the web apps use. Access tokens are short-lived
// Auth.js-encrypted JWTs (same JWE mechanism as the web session cookie, but
// under a distinct `salt` so a leaked access token can't be replayed as a
// web session cookie or vice versa). Refresh tokens are opaque random
// strings, stored only as a hash so a leaked database can't be turned into
// live sessions.
const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SALT = "mobile-access-token";

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set");
  return s;
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export interface MobileTokenUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: Role;
  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isProvider: boolean;
  // Whether a Business row exists yet — distinct from isProvider (role can
  // flip to PROVIDER at registration before onboarding ever runs). The
  // mobile-provider app uses this to gate into /onboarding, mirroring
  // apps/provider's own server-component redirect (`!business → /onboarding`).
  hasBusiness: boolean;
}

export interface MobileAccessTokenPayload {
  uid: string;
  email: string;
  role: Role;
  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isProvider: boolean;
  exp: number;
}

export async function mintAccessToken(user: MobileTokenUser): Promise<string> {
  return encode({
    secret: secret(),
    salt: SALT,
    maxAge: ACCESS_TOKEN_MAX_AGE,
    token: {
      uid: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      isProvider: user.isProvider,
    },
  });
}

export async function verifyAccessToken(token: string): Promise<MobileAccessTokenPayload | null> {
  const payload = await decode({ secret: secret(), salt: SALT, token }).catch(() => null);
  if (!payload?.uid) return null;
  return payload as unknown as MobileAccessTokenPayload;
}

async function userToTokenUser(userId: string): Promise<MobileTokenUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { business: { select: { id: true } } },
  });
  if (!user || user.status === "SUSPENDED" || user.status === "DEACTIVATED") return null;
  return {
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
  };
}

export interface MobileSessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function createMobileSession(user: MobileTokenUser, deviceInfo?: string): Promise<MobileSessionTokens> {
  const accessToken = await mintAccessToken(user);
  const refreshToken = randomBytes(32).toString("hex");
  await prisma.mobileSession.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      deviceInfo,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
    },
  });
  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_MAX_AGE };
}

/** Rotates a refresh token: revokes the old row, issues a fresh access + refresh token pair. */
export async function rotateMobileSession(refreshToken: string): Promise<MobileSessionTokens | null> {
  const hash = hashToken(refreshToken);
  const existing = await prisma.mobileSession.findUnique({ where: { refreshTokenHash: hash } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) return null;

  const tokenUser = await userToTokenUser(existing.userId);
  if (!tokenUser) return null;

  await prisma.mobileSession.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
  return createMobileSession(tokenUser, existing.deviceInfo ?? undefined);
}

export async function revokeMobileSession(refreshToken: string): Promise<void> {
  await prisma.mobileSession.updateMany({
    where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** "Log out everywhere" — revokes every active mobile session for a user. */
export async function revokeAllMobileSessions(userId: string): Promise<void> {
  await prisma.mobileSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}
