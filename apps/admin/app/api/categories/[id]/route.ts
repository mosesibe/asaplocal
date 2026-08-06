import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isRegulatedTrade: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  await prisma.category.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const [serviceCount, jobRequestCount, childCount] = await Promise.all([
    prisma.service.count({ where: { categoryId: id } }),
    prisma.jobRequest.count({ where: { categoryId: id } }),
    prisma.category.count({ where: { parentId: id } }),
  ]);
  if (serviceCount > 0 || jobRequestCount > 0 || childCount > 0) {
    return NextResponse.json(
      { message: `Can't delete — ${serviceCount} service(s), ${jobRequestCount} job request(s), ${childCount} subcategory(ies) still reference it. Deactivate it instead.` },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
