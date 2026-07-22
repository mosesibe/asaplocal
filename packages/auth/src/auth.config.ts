import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@asaplocal/db";

/**
 * Edge-safe auth config (no Node-only APIs besides bcrypt in the
 * Credentials `authorize`, which only runs in the Node runtime — the
 * middleware import of this file uses the `authorized` callback only).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email as string } });
        if (!user?.passwordHash) return null;
        if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") return null;
        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.email, role: user.role, status: user.status };
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuthPages = ["/login", "/register", "/forgot-password"].some((p) =>
        request.nextUrl.pathname.startsWith(p)
      );
      if (isOnAuthPages) return true;
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
