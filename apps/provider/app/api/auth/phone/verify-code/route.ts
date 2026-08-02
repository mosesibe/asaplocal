import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { verifyPhoneVerificationCode } from "@asaplocal/core";

const schema = z.object({ code: z.string().length(6) });

const MESSAGES = {
  expired: { message: "Code expired — request a new one", status: 410 },
  "too-many-attempts": { message: "Too many attempts — request a new code", status: 429 },
  incorrect: { message: "Incorrect code", status: 422 },
} as const;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const result = await verifyPhoneVerificationCode(session.user.id, parsed.data.code);
  if (!result.ok) {
    const { message, status } = MESSAGES[result.reason];
    return NextResponse.json({ message }, { status });
  }

  return NextResponse.json({ verified: true });
}
