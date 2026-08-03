import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { stripHtml, recomputeTrustTier } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  beforeUrl: z.string().url().optional(),
  afterUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  photoUrls: z.array(z.string().url()).default([]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });
  const data = parsed.data;

  if (!data.beforeUrl && !data.afterUrl && !data.videoUrl && data.photoUrls.length === 0) {
    return NextResponse.json({ message: "Add at least one photo or video" }, { status: 422 });
  }

  const item = await prisma.portfolioItem.create({
    data: {
      businessId: business.id,
      title: data.title ? stripHtml(data.title) : undefined,
      description: data.description ? stripHtml(data.description) : undefined,
      categoryId: data.categoryId,
      beforeUrl: data.beforeUrl,
      afterUrl: data.afterUrl,
      videoUrl: data.videoUrl,
      photoUrls: data.photoUrls,
    },
  });
  await recomputeTrustTier(business.id);

  return NextResponse.json({ id: item.id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const item = await prisma.portfolioItem.findUnique({ where: { id } });
  if (!item || item.businessId !== business.id) return NextResponse.json({ message: "Not found" }, { status: 404 });

  await prisma.portfolioItem.delete({ where: { id } });
  await recomputeTrustTier(business.id);
  return NextResponse.json({ ok: true });
}
