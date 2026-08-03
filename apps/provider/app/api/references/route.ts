import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { sendEmail, emailTemplates } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({
  refereeName: z.string().min(1),
  refereeEmail: z.string().email(),
  relationshipNote: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const existingCount = await prisma.businessReference.count({ where: { businessId: business.id } });
  if (existingCount >= 3) return NextResponse.json({ message: "Maximum of 3 references" }, { status: 409 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const token = randomBytes(32).toString("hex");
  const reference = await prisma.businessReference.create({
    data: {
      businessId: business.id,
      refereeName: parsed.data.refereeName,
      refereeEmail: parsed.data.refereeEmail,
      relationshipNote: parsed.data.relationshipNote,
      verificationToken: token,
    },
  });

  const link = `${process.env.NEXT_PUBLIC_WEB_URL}/references/verify/${token}`;
  await sendEmail({
    to: parsed.data.refereeEmail,
    subject: `${business.name} listed you as a reference`,
    html: emailTemplates.referenceRequest(business.name, parsed.data.refereeName, link),
  }).catch(() => {});

  return NextResponse.json({ id: reference.id }, { status: 201 });
}
