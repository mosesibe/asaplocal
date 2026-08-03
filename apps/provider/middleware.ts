import { NextResponse } from "next/server";
import { authMiddleware as auth } from "@asaplocal/auth";

const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/verify-email", "/api/webhooks", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const user = req.auth?.user;
  if (!user) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  // isProvider covers both role === "PROVIDER" (fresh signups) and an
  // existing customer who confirmed their password to add a business —
  // that account's role stays "CUSTOMER" so it keeps customer-side access
  // on the web app too. See User.providerSince / packages/auth/src/auth.ts.
  if (!user.isProvider) {
    return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_WEB_URL ?? "/", req.nextUrl.origin));
  }
  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    return NextResponse.redirect(new URL("/account-suspended", req.nextUrl.origin));
  }
  // Phone verification is temporarily not enforced — Twilio isn't set up
  // yet. Flip NEXT_PUBLIC_REQUIRE_PHONE_VERIFICATION back to unset/"true"
  // once it is; nothing else needs to change.
  const requirePhone = process.env.NEXT_PUBLIC_REQUIRE_PHONE_VERIFICATION !== "false";
  if ((!user.isEmailVerified || (requirePhone && !user.isPhoneVerified)) && !pathname.startsWith("/verify")) {
    return NextResponse.redirect(new URL("/verify", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)).*)"],
};
