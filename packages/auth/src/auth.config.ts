import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { NextRequest } from "next/server";
import { verifyCredentials } from "./credentials";
import { verifyAccessToken } from "./mobile-tokens";

/**
 * Edge-safe auth config (no Node-only APIs besides bcrypt in the
 * Credentials `authorize`, which only runs in the Node runtime — the
 * middleware import of this file uses the `authorized` callback only).
 */
export const authConfig = {
  // Each app (web/provider/admin) runs on its own origin but shares one
  // NEXTAUTH_URL in local dev — trust the incoming Host header instead of
  // that fixed value so redirects stay on the app that issued them.
  trustHost: true,
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
        return verifyCredentials(credentials.email as string, credentials.password as string);
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuthPages = ["/login", "/register", "/forgot-password", "/reset-password"].some((p) =>
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
        session.user.isEmailVerified = !!token.isEmailVerified;
        session.user.isPhoneVerified = !!token.isPhoneVerified;
        session.user.isProvider = !!token.isProvider;
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
const { auth: rawAuthMiddleware } = NextAuth(authConfig);

/**
 * Wraps the raw cookie-session middleware so the native mobile apps' bearer
 * access token is recognised too — otherwise every request from a mobile
 * client (which never carries the web session cookie) looks logged-out to
 * middleware and gets bounced before it reaches the route handler, even
 * though `auth()` inside the route (see ./bearer.ts) would have accepted it.
 * Stays Edge-safe: `verifyAccessToken` only decodes the JWT (no Prisma), the
 * same way the cookie session's `session` callback above avoids a DB call by
 * trusting the claims already baked into the token.
 */
export function authMiddleware(handler: (req: NextRequest & { auth: any }) => any) {
  return rawAuthMiddleware(async (req) => {
    if (!req.auth?.user) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const payload = await verifyAccessToken(authHeader.slice("Bearer ".length));
        if (payload?.uid) {
          Object.assign(req, {
            auth: {
              user: {
                id: payload.uid,
                email: payload.email,
                role: payload.role,
                status: payload.status,
                isEmailVerified: payload.isEmailVerified,
                isPhoneVerified: payload.isPhoneVerified,
                isProvider: payload.isProvider,
              },
              expires: new Date(payload.exp * 1000).toISOString(),
            },
          });
        }
      }
    }
    return handler(req as any);
  });
}
