import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { getReferralSummary } from "@asaplocal/core";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const summary = await getReferralSummary(session.user.id);
  return NextResponse.json(summary);
}
