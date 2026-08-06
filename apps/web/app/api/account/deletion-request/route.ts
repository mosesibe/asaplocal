import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { checkRateLimit, requestAccountDeletion, writeAuditLog } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ reason: z.string().max(500).optional() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await checkRateLimit("account-deletion-request", session.user.id, 3, 3600);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const request = await requestAccountDeletion(session.user.id, parsed.data.reason);
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "account.deletion_request.create",
    targetType: "AccountDeletionRequest",
    targetId: request.id,
  });
  return NextResponse.json({ ok: true });
}
