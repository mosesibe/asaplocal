import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { resolveLeadRefund } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ decision: z.enum(["APPROVED", "REJECTED"]), note: z.string().max(500).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  try {
    await resolveLeadRefund(id, session.user.id, parsed.data.decision, parsed.data.note);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 400 });
  }
}
