import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { z } from "zod";

// Registers an Expo push token for the native apps — separate from
// /api/push/subscribe (web push's endpoint/p256dh/auth keypair), since
// Expo's push service takes one opaque token per device instead.
const schema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid push token" }, { status: 422 });

  await prisma.mobilePushToken.upsert({
    where: { token: parsed.data.token },
    update: { userId: session.user.id, platform: parsed.data.platform },
    create: { userId: session.user.id, token: parsed.data.token, platform: parsed.data.platform },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
