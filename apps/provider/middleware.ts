import { NextRequest, NextResponse } from "next/server";
import { authMiddleware as auth } from "@asaplocal/auth";

const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/api/webhooks", "/api/auth", "/api/mobile/auth"];

// Dev-only: lets the mobile app's browser-preview mode (`expo start --web`,
// a different origin — localhost:8081, or an ngrok tunnel) call these
// bearer-authenticated APIs at all. A real native build never hits this —
// React Native's fetch doesn't enforce CORS, only browsers do — so this
// never changes production's CORS posture.
function withDevCors(req: Pick<NextRequest, "headers">, res: NextResponse): NextResponse {
  if (process.env.NODE_ENV === "production") return res;
  const origin = req.headers.get("origin");
  if (!origin) return res;
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export default auth((req) => {
  if (req.method === "OPTIONS" && process.env.NODE_ENV !== "production") {
    return withDevCors(req, new NextResponse(null, { status: 204 }));
  }

  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return withDevCors(req, NextResponse.next());

  // API routes are called via fetch(), not navigated to — a redirect to an
  // HTML page is useless to a JSON-expecting client. Every route handler
  // still does its own auth check; middleware just needs to fail the same
  // shape instead of silently turning into an HTML response.
  const isApiRoute = pathname.startsWith("/api/");

  const user = req.auth?.user;
  if (!user) {
    if (isApiRoute) return withDevCors(req, NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  // isProvider covers both role === "PROVIDER" (fresh signups) and an
  // existing customer who confirmed their password to add a business —
  // that account's role stays "CUSTOMER" so it keeps customer-side access
  // on the web app too. See User.providerSince / packages/auth/src/auth.ts.
  if (!user.isProvider) {
    if (isApiRoute) return withDevCors(req, NextResponse.json({ message: "Forbidden" }, { status: 403 }));
    return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_WEB_URL ?? "/", req.nextUrl.origin));
  }
  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    if (isApiRoute) return withDevCors(req, NextResponse.json({ message: "Account suspended" }, { status: 403 }));
    return NextResponse.redirect(new URL("/account-suspended", req.nextUrl.origin));
  }
  // Set to "false" to temporarily disable the phone-verification gate
  // (e.g. an SMS provider outage) without a code change.
  const requirePhone = process.env.NEXT_PUBLIC_REQUIRE_PHONE_VERIFICATION !== "false";
  if ((!user.isEmailVerified || (requirePhone && !user.isPhoneVerified)) && !pathname.startsWith("/verify")) {
    if (isApiRoute) return withDevCors(req, NextResponse.json({ message: "Verify your account first" }, { status: 403 }));
    return NextResponse.redirect(new URL("/verify", req.nextUrl.origin));
  }
  return withDevCors(req, NextResponse.next());
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp)).*)"],
};
