import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";

// Lets the app confirm a stored token pair is still valid on launch (a
// revoked/expired refresh token means the access token will also fail, at
// which point the client should fall back to the login screen).
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user: session.user });
}
