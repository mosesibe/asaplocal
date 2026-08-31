import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { setMarketingPreferences } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ email: z.boolean().optional(), sms: z.boolean().optional() });

// JSON counterpart to the account drawer's Preferences panel — the web app
// passes marketingEmail/marketingSms down as server-component props instead.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { marketingEmail: true, marketingSms: true } });
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ email: user.marketingEmail, sms: user.marketingSms });
}

/** Withdrawal must be as easy as giving consent — hence a plain authed toggle. */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  await setMarketingPreferences(session.user.id, parsed.data, "account-settings");
  return NextResponse.json({ ok: true });
}
