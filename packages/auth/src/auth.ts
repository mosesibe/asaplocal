import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@asaplocal/db";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = (user as any).role;
        token.status = (user as any).status;
        token.uid = user.id;
      }
      // Re-hydrate role/status on every request in case an admin changed them.
      if (trigger === "update" || !user) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.uid as string } });
        if (dbUser) {
          token.role = dbUser.role;
          token.status = dbUser.status;
        }
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
