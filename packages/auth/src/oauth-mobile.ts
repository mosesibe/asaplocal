import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@asaplocal/db";
import type { User } from "@prisma/client";

/**
 * Server-side counterparts to the native Google/Apple sign-in SDKs used by
 * the mobile apps — those hand back a raw idToken/identityToken instead of
 * going through Auth.js's browser redirect flow, so this verifies them and
 * upserts the same User/Account rows the web PrismaAdapter would, for the
 * two mobile routes (apps/web and apps/provider each have their own copy of
 * app/api/mobile/auth/{google,apple}/route.ts) to mint a bearer session from.
 *
 * Google's own verifyGoogleIdToken lives in ./google-verify.ts instead of
 * here — see the comment on its import in the route handlers for why.
 */

export interface VerifiedOAuthIdentity {
  providerAccountId: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

/**
 * `expectedBundleId` is the mobile app's own bundle/package id (e.g.
 * pro.asaplocal.customer) — for native Sign In With Apple that's the
 * identityToken's `aud`, distinct from the Services ID used for the web
 * OAuth flow (AUTH_APPLE_ID).
 */
export async function verifyAppleIdentityToken(
  identityToken: string,
  expectedBundleId: string,
  fullName?: { givenName?: string | null; familyName?: string | null } | null
): Promise<VerifiedOAuthIdentity> {
  const { payload } = await jwtVerify(identityToken, appleJwks, {
    issuer: "https://appleid.apple.com",
    audience: expectedBundleId,
  });
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") throw new Error("Invalid Apple token");
  const name = fullName ? [fullName.givenName, fullName.familyName].filter(Boolean).join(" ") || null : null;
  return { providerAccountId: payload.sub, email: payload.email, name };
}

/**
 * Mirrors what the Auth.js PrismaAdapter does on OAuth sign-in
 * (allowDangerousEmailAccountLinking: true on both the web Google and Apple
 * providers — see auth.config.ts / auth.ts): look up the linked account,
 * else link onto an existing user with that email, else create a new one.
 */
export async function findOrCreateOAuthUser(provider: "google" | "apple", identity: VerifiedOAuthIdentity): Promise<User> {
  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId: identity.providerAccountId } },
    include: { user: true },
  });
  if (existingAccount) return existingAccount.user;

  const existingUser = await prisma.user.findUnique({ where: { email: identity.email } });
  if (existingUser) {
    await prisma.account.create({
      data: { userId: existingUser.id, type: "oauth", provider, providerAccountId: identity.providerAccountId },
    });
    return existingUser;
  }

  return prisma.user.create({
    data: {
      email: identity.email,
      name: identity.name ?? undefined,
      image: identity.image ?? undefined,
      // Google/Apple have already verified the email before issuing the
      // token — mirrors what Auth.js's own adapter does for the web OAuth
      // flow when the provider profile marks the email verified.
      emailVerified: new Date(),
      accounts: { create: { type: "oauth", provider, providerAccountId: identity.providerAccountId } },
    },
  });
}
