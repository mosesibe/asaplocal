import NextAuth from "next-auth";
import WebAuthn from "next-auth/providers/webauthn";
import Apple from "next-auth/providers/apple";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@asaplocal/db";
import { authConfig } from "./auth.config";
import { getAppleClientSecret } from "./apple-secret";

// Apple sign-in needs four env vars (see apple-secret.ts) that aren't set in
// every environment yet (e.g. local dev before Apple credentials exist) — so
// this is opt-in rather than throwing at import time and breaking every
// other provider (Google, Credentials, WebAuthn) along with it.
function appleProvider() {
  if (!process.env.APPLE_CLIENT_ID || !process.env.APPLE_TEAM_ID || !process.env.APPLE_KEY_ID || !process.env.APPLE_PRIVATE_KEY) {
    return null;
  }
  return Apple({
    clientId: process.env.APPLE_CLIENT_ID,
    clientSecret: getAppleClientSecret(),
    allowDangerousEmailAccountLinking: true,
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  // WebAuthn needs the Prisma adapter (Authenticator table), so it's only
  // added to this Node-runtime instance, not the edge-safe authMiddleware.
  // Apple lives here too: its clientSecret is a JWT signed with Node's
  // `crypto` (see apple-secret.ts), which isn't available in the Edge
  // runtime that auth.config.ts gets bundled into for middleware.
  experimental: { enableWebAuthn: true },
  providers: [...authConfig.providers, WebAuthn({}), appleProvider()].filter((p): p is NonNullable<typeof p> => p !== null),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) token.uid = user.id as string;
      // Always re-hydrate from the DB rather than trusting `user` — it's
      // only populated on initial sign-in, and for OAuth sign-ins it's the
      // adapter's raw row (no isProvider/emailVerified/phoneVerified
      // booleans on it). This also picks up admin-made changes and
      // verification completions on every subsequent request.
      const dbUser = await prisma.user.findUnique({
        where: { id: token.uid as string },
        include: { business: { select: { id: true } } },
      });
      if (dbUser) {
        token.role = dbUser.role;
        token.status = dbUser.status;
        token.isEmailVerified = !!dbUser.emailVerified;
        token.isPhoneVerified = !!dbUser.phoneVerifiedAt;
        token.isProvider = dbUser.role === "PROVIDER" || !!dbUser.business || !!dbUser.providerSince;
      }
      return token;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});
      }
    },
  },
});
