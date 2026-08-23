import { NextResponse } from "next/server";
import { authMiddleware as auth } from "@asaplocal/auth";

const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/api/webhooks", "/api/auth"];

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
  // isProvider covers both role === "PROVIDER" (fresh signups) and an
  // existing customer who confirmed their password to add a business —
  // that account's role stays "CUSTOMER" so it keeps customer-side access
  // on the web app too. See User.providerSince / packages/auth/src/auth.ts.
  if (!user.isProvider) {
    if (isApiRoute) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_WEB_URL ?? "/", req.nextUrl.origin));
  }
  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    if (isApiRoute) return NextResponse.json({ message: "Account suspended" }, { status: 403 });
    return NextResponse.redirect(new URL("/account-suspended", req.nextUrl.origin));
  }
  // Set to "false" to temporarily disable the phone-verification gate
  // (e.g. an SMS provider outage) without a code change.
  const requirePhone = process.env.NEXT_PUBLIC_REQUIRE_PHONE_VERIFICATION !== "false";
  if ((!user.isEmailVerified || (requirePhone && !user.isPhoneVerified)) && !pathname.startsWith("/verify")) {
    if (isApiRoute) return NextResponse.json({ message: "Verify your account first" }, { status: 403 });
    return NextResponse.redirect(new URL("/verify", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp)).*)"],
};
