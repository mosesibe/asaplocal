import NextAuth from "next-auth";
import WebAuthn from "next-auth/providers/webauthn";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@asaplocal/db";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  // WebAuthn needs the Prisma adapter (Authenticator table), so it's only
  // added to this Node-runtime instance, not the edge-safe authMiddleware.
  experimental: { enableWebAuthn: true },
  providers: [...authConfig.providers, WebAuthn({})],
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
