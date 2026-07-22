import { NextResponse } from "next/server";
import { authMiddleware as auth } from "@asaplocal/auth";

/**
 * RBAC for the customer app. Anyone can browse marketplace/SEO pages;
 * account areas require a signed-in CUSTOMER. Providers/dispatchers/admins
 * are bounced to their own apps rather than allowed into customer-only
 * routes (each role has its own deployed app).
 */
const PUBLIC_PREFIXES = ["/", "/search", "/providers", "/jobs/new", "/api/jobs/suggest", "/login", "/register", "/forgot-password", "/verify-email", "/api/webhooks", "/api/auth", "/sitemap.xml", "/robots.txt", "/how-it-works", "/pricing", "/about", "/trust-safety", "/terms", "/privacy"];

// Account-area routes that must never be swallowed by the /[slug] SEO
// catch-all's public match below, even though they're single path segments.
const PROTECTED_TOP_LEVEL = ["dashboard", "favourites", "messages", "jobs", "bookings", "account-suspended"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";
  const isSeoLandingPage = /^[a-z0-9-]+$/.test(firstSegment) && !PROTECTED_TOP_LEVEL.includes(firstSegment) && pathname === `/${firstSegment}`;
  const isPublic = PUBLIC_PREFIXES.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p))) || isSeoLandingPage;

  if (isPublic) return NextResponse.next();

  const user = req.auth?.user;
  if (!user) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (user.role === "PROVIDER") return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_PROVIDER_URL ?? "/", req.nextUrl.origin));
  if (user.role === "ADMIN" || user.role === "DISPATCHER") return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_ADMIN_URL ?? "/", req.nextUrl.origin));

  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    return NextResponse.redirect(new URL("/account-suspended", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp)).*)"],
};
