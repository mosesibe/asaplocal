import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { setMarketingPreferences } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ email: z.boolean().optional(), sms: z.boolean().optional() });

/** Withdrawal must be as easy as giving consent — hence a plain authed toggle. */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  await setMarketingPreferences(session.user.id, parsed.data, "account-settings");
  return NextResponse.json({ ok: true });
}
