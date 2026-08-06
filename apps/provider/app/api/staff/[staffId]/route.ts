import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
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

/** Editing an identity-critical field (name/photo/ID images) sends the record back for re-review, same as the rest of verification. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const staffMember = await prisma.staffMember.findUnique({ where: { id: staffId } });
  if (!staffMember || staffMember.businessId !== business.id) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });
  const data = parsed.data;

  const identityChanged =
    data.fullName !== staffMember.fullName ||
    data.profilePhotoUrl !== staffMember.profilePhotoUrl ||
    data.idFrontImageUrl !== staffMember.idFrontImageUrl ||
    data.idBackImageUrl !== staffMember.idBackImageUrl;

  const updated = await prisma.staffMember.update({
    where: { id: staffId },
    data: {
      ...data,
      ...(identityChanged
        ? { approvalStatus: "PENDING", submittedAt: new Date(), reviewedAt: null, reviewedById: null, reviewNote: null }
        : {}),
    },
  });

  return NextResponse.json({ id: updated.id });
}
