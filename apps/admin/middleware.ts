import { NextResponse } from "next/server";
import { authMiddleware as auth } from "@asaplocal/auth";

const PUBLIC_PREFIXES = ["/login"];

/** Routes a DISPATCHER may access. Everything else is ADMIN-only. */
const DISPATCHER_ALLOWED_PREFIXES = ["/dispatcher", "/jobs", "/api/dispatcher", "/api/jobs"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const user = req.auth?.user;
  if (!user) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (user.role !== "ADMIN" && user.role !== "DISPATCHER") {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if (user.role === "DISPATCHER" && !DISPATCHER_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p)) && pathname !== "/") {
    return NextResponse.redirect(new URL("/dispatcher", req.nextUrl.origin));
  }

  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    return NextResponse.redirect(new URL("/account-suspended", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)).*)"],
};
