import { NextResponse } from "next/server";
// Deliberately NOT imported from "@asaplocal/auth" (the package root): that
// barrel unconditionally re-exports auth.ts too, which eagerly constructs
// the Apple provider (crypto.createSign-based client-secret JWT) at module
// load — Node's crypto.createSign isn't available in the Edge runtime this
// middleware bundles into, and this pulls it in even though nothing here
// uses it. authMiddleware is fully self-contained in auth.config.ts, so
// import it directly to keep auth.ts out of this bundle entirely.
import { authMiddleware as auth } from "@asaplocal/auth/src/auth.config";

const PUBLIC_PREFIXES = ["/login", "/forgot-password", "/reset-password", "/api/auth"];

/** Routes a DISPATCHER may access. Everything else is ADMIN-only. */
const DISPATCHER_ALLOWED_PREFIXES = ["/dispatch", "/users", "/api/dispatcher", "/api/jobs", "/api/users"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // API routes are called via fetch(), not navigated to — a redirect to an
  // HTML page is useless to a JSON-expecting client. Every route handler
  // still does its own auth check; middleware just needs to fail the same
  // shape instead of silently turning into an HTML response.
  const isApiRoute = pathname.startsWith("/api/");

  const user = req.auth?.user;
  if (!user) {
    if (isApiRoute) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (user.role !== "ADMIN" && user.role !== "DISPATCHER") {
    if (isApiRoute) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if (user.role === "DISPATCHER" && !DISPATCHER_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p)) && pathname !== "/") {
    if (isApiRoute) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/dispatch", req.nextUrl.origin));
  }

  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    if (isApiRoute) return NextResponse.json({ message: "Account suspended" }, { status: 403 });
    return NextResponse.redirect(new URL("/account-suspended", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:png|jpg|jpeg|svg|webp)).*)"],
};
