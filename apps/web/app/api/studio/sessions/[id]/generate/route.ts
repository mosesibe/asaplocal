import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { generateConcepts, mirrorRemoteImage, type SpaceAnalysis, type GeneratedConcept } from "@asaplocal/core";

// Three renders in parallel. Each takes a few seconds, but the ceiling is
// raised well above the observed time so a slow provider response degrades
// into a longer wait rather than a truncated request.
export const maxDuration = 300;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const studioSession = await prisma.designStudioSession.findUnique({ where: { id } });
  if (!studioSession || studioSession.customerId !== session.user.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  // Renders are the expensive half — never repeat them for a session that has
  // already produced concepts.
  if (studioSession.status !== "GENERATING") {
    return NextResponse.json({ concepts: studioSession.concepts, status: studioSession.status });
  }

  const analysis = studioSession.analysis as unknown as SpaceAnalysis | null;
  if (!analysis?.styles?.length) {
    await prisma.designStudioSession.update({
      where: { id },
      data: { status: "FAILED", failureReason: "No styles to render" },
    });
    return NextResponse.json({ message: "Something went wrong — please start again." }, { status: 500 });
  }

  const { concepts, aiCostPence } = await generateConcepts(studioSession.heroPhotoUrl, analysis.styles);

  // The provider's image URLs expire, so anything we intend to keep has to be
  // copied into our own storage before it's persisted. A concept whose mirror
  // fails is kept as url:null rather than sinking the whole set.
  const stored: GeneratedConcept[] = await Promise.all(
    concepts.map(async (concept) => {
      if (!concept.url) return concept;
      try {
        return { ...concept, url: await mirrorRemoteImage(concept.url, "design-concept", session.user.id) };
      } catch (err) {
        console.error("[studio] mirroring concept failed", err);
        return { ...concept, url: null };
      }
    })
  );

  const usable = stored.filter((c) => c.url);
  // Strip editPrompt before persisting — it's an internal instruction, and the
  // row is read straight back to the browser.
  const publicConcepts = stored.map(({ editPrompt: _editPrompt, ...rest }) => rest);

  const updated = await prisma.designStudioSession.update({
    where: { id },
    data: {
      concepts: publicConcepts as object[],
      aiCostPence,
      status: usable.length > 0 ? "READY" : "FAILED",
      failureReason: usable.length > 0 ? null : "All renders failed",
    },
  });

  if (usable.length === 0) {
    return NextResponse.json(
      { message: "We couldn't create designs from that photo. Try a different angle or a clearer shot." },
      { status: 502 }
    );
  }

  return NextResponse.json({ concepts: publicConcepts, status: updated.status });
}
