import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@asaplocal/db";
import { recomputeTrustTier } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ testimonial: z.string().max(1000).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reference = await prisma.businessReference.findUnique({ where: { verificationToken: token } });
  if (!reference) return NextResponse.json({ message: "Invalid or expired link" }, { status: 404 });
  if (reference.status === "VERIFIED") return NextResponse.json({ message: "Already confirmed" }, { status: 409 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  await prisma.businessReference.update({
    where: { id: reference.id },
    data: { status: "VERIFIED", testimonial: parsed.data.testimonial, verifiedAt: new Date() },
  });
  await recomputeTrustTier(reference.businessId);

  return NextResponse.json({ ok: true });
}
