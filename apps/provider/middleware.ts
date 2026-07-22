import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";

const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/verify-email", "/api/webhooks"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const user = req.auth?.user;
  if (!user) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  if (user.role !== "PROVIDER") {
    return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_WEB_URL ?? "/", req.nextUrl.origin));
  }
  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    return NextResponse.redirect(new URL("/account-suspended", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)).*)"],
};
