import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revokeMobileSession } from "@asaplocal/auth";

const schema = z.object({ refreshToken: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Missing refresh token." }, { status: 422 });

  await revokeMobileSession(parsed.data.refreshToken);
  return NextResponse.json({ ok: true });
}
