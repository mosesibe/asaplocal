import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { canHaveStaff } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().min(1),
  jobTitle: z.string().optional(),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  profilePhotoUrl: z.string().url(),
  idFrontImageUrl: z.string().url(),
  idBackImageUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });
  if (!canHaveStaff(business.businessType)) {
    return NextResponse.json({ message: "Staff management is only available for limited companies and partnerships" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const staffMember = await prisma.staffMember.create({
    data: { businessId: business.id, ...parsed.data, approvalStatus: "PENDING" },
  });

  return NextResponse.json({ id: staffMember.id }, { status: 201 });
}
