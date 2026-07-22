import NextAuth, { type NextAuthConfig } from "next-auth";
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
    // Prisma-free token->session mapping — safe to run in the Edge runtime,
    // unlike the `jwt` callback override in auth.ts (which re-hydrates from
    // the DB and therefore must only run in the Node.js runtime).
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as any;
        session.user.status = token.status as any;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

/**
 * Edge-safe NextAuth instance for middleware use only: no Prisma adapter, no
 * DB-touching callbacks (just token decoding + the `authorized`/`session`
 * callbacks above). Prisma's client cannot run in the Edge runtime that
 * Next.js middleware executes in, so middleware.ts files must import
 * `authMiddleware` here rather than the full `auth` from ./auth.ts.
 */
export const { auth: authMiddleware } = NextAuth(authConfig);
