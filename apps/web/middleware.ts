import { NextResponse } from "next/server";
import { authMiddleware as auth } from "@asaplocal/auth";

/**
 * RBAC for the customer app. Anyone can browse marketplace/SEO pages;
 * account areas require a signed-in CUSTOMER. Providers/dispatchers/admins
 * are bounced to their own apps rather than allowed into customer-only
 * routes (each role has its own deployed app).
 */
const PUBLIC_PREFIXES = ["/", "/search", "/providers", "/jobs/new", "/api/jobs/suggest", "/api/ai-buddy", "/api/geo", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/references", "/api/references", "/api/webhooks", "/api/auth", "/sitemap.xml", "/robots.txt", "/how-it-works", "/pricing", "/about", "/trust-safety", "/terms", "/privacy", "/unsubscribe"];

// Account-area routes that must never be swallowed by the /[slug] SEO
// catch-all's public match below, even though they're single path segments.
const PROTECTED_TOP_LEVEL = ["dashboard", "favourites", "messages", "jobs", "bookings", "account-suspended", "activity"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";
  const isSeoLandingPage = /^[a-z0-9-]+$/.test(firstSegment) && !PROTECTED_TOP_LEVEL.includes(firstSegment) && pathname === `/${firstSegment}`;
  const isPublic = PUBLIC_PREFIXES.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p))) || isSeoLandingPage;

  if (isPublic) return NextResponse.next();

  // API routes are called via fetch(), not navigated to — a client expecting
  // JSON has no way to handle an HTML redirect gracefully (fetch silently
  // follows it, so `res.status` is never 401 and callers that already check
  // for it, e.g. the homepage AI job form, never see it). Every route
  // handler still does its own auth check and returns a proper JSON error;
  // middleware here only needs to short-circuit with the same shape.
  const isApiRoute = pathname.startsWith("/api/");

  const user = req.auth?.user;
  if (!user) {
    if (isApiRoute) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (user.role === "PROVIDER") {
    if (isApiRoute) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_PROVIDER_URL ?? "/", req.nextUrl.origin));
  }
  if (user.role === "ADMIN" || user.role === "DISPATCHER") {
    if (isApiRoute) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_ADMIN_URL ?? "/", req.nextUrl.origin));
  }

  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    if (isApiRoute) return NextResponse.json({ message: "Account suspended" }, { status: 403 });
    return NextResponse.redirect(new URL("/account-suspended", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp)).*)"],
};
