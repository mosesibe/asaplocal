import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { resolveStudioCategoryId, type GeneratedConcept } from "@asaplocal/core";

const schema = z.object({ selectedIndex: z.number().int().min(0).max(9) });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const studioSession = await prisma.designStudioSession.findUnique({ where: { id } });
  if (!studioSession || studioSession.customerId !== session.user.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(studioSession);
}

/** Records which concept the customer chose, and mirrors its estimate onto the session. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid selection" }, { status: 422 });

  const studioSession = await prisma.designStudioSession.findUnique({ where: { id } });
  if (!studioSession || studioSession.customerId !== session.user.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const concepts = (studioSession.concepts ?? []) as unknown as GeneratedConcept[];
  const chosen = concepts[parsed.data.selectedIndex];
  if (!chosen?.url) return NextResponse.json({ message: "That design isn't available." }, { status: 422 });

  const updated = await prisma.designStudioSession.update({
    where: { id },
    data: {
      selectedIndex: parsed.data.selectedIndex,
      status: "SELECTED",
      estimateMinPence: chosen.costMinPence,
      estimateMaxPence: chosen.costMaxPence,
      estimateDurationDays: chosen.durationDays,
    },
  });

  // Resolved server-side so web and mobile hand off the same category, and so
  // it can be classified from the concept's scope rather than the space alone.
  const analysis = studioSession.analysis as { needsSpecialist?: boolean } | null;
  const categoryId = await resolveStudioCategoryId({
    spaceType: studioSession.spaceType,
    needsSpecialist: !!analysis?.needsSpecialist,
    briefText: studioSession.briefText,
    concept: chosen,
  }).catch(() => null);

  return NextResponse.json({ id: updated.id, selectedIndex: updated.selectedIndex, categoryId });
}
