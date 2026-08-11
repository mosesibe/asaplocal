import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { checkRateLimit, sendPhoneVerificationCode } from "@asaplocal/core";

const schema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid phone number"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 422 });

  try {
    await checkRateLimit("phone-verify-send", session.user.id, 5, 3600);
    await sendPhoneVerificationCode(session.user.id, parsed.data.phone);
  } catch (e) {
    const statusCode = (e as Error & { statusCode?: number }).statusCode;
    if (statusCode) return NextResponse.json({ message: (e as Error).message }, { status: statusCode });
    console.error("[account/phone/send-code]", e);
    return NextResponse.json({ message: "Something went wrong sending the code. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
