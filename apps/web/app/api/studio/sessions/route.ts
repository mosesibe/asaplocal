import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { analyseSpace, checkRateLimit, isStudioConfigured } from "@asaplocal/core";

// The vision pass reads the photo and proposes directions; it runs well inside
// the default limit, but generation (the next call) is the slow half.
export const maxDuration = 60;

/** Free concept sets per customer per calendar month. */
const MONTHLY_FREE_SESSIONS = Number(process.env.STUDIO_FREE_SESSIONS_PER_MONTH ?? 3);

const schema = z.object({
  sourcePhotos: z.array(z.string().url()).min(1).max(5),
  heroPhotoUrl: z.string().url(),
  briefText: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  // Generating images costs real money per call, so unlike the job-posting
  // flow there is no anonymous path here.
  if (!session?.user) {
    return NextResponse.json({ message: "Please sign in to use Redesign Studio." }, { status: 401 });
  }
  if (!isStudioConfigured()) {
    return NextResponse.json({ message: "Redesign Studio isn't available right now." }, { status: 503 });
  }

  try {
    await checkRateLimit("studio-session", session.user.id, 6, 3600);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Please add at least one photo of the space." }, { status: 422 });
  }
  // The hero angle must be one of the uploaded photos — never an arbitrary URL.
  if (!parsed.data.sourcePhotos.includes(parsed.data.heroPhotoUrl)) {
    return NextResponse.json({ message: "Choose which photo to redesign." }, { status: 422 });
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const usedThisMonth = await prisma.designStudioSession.count({
    where: { customerId: session.user.id, createdAt: { gte: monthStart } },
  });
  if (usedThisMonth >= MONTHLY_FREE_SESSIONS) {
    return NextResponse.json(
      {
        message: `You've used all ${MONTHLY_FREE_SESSIONS} of this month's free designs. They reset on the 1st.`,
        quotaExhausted: true,
      },
      { status: 402 }
    );
  }

  const analysis = await analyseSpace(parsed.data.heroPhotoUrl, parsed.data.briefText);
  if (!analysis) {
    return NextResponse.json(
      { message: "We couldn't read that photo. Try a clearer, well-lit shot of the whole space." },
      { status: 422 }
    );
  }

  const studioSession = await prisma.designStudioSession.create({
    data: {
      customerId: session.user.id,
      sourcePhotos: parsed.data.sourcePhotos,
      heroPhotoUrl: parsed.data.heroPhotoUrl,
      briefText: parsed.data.briefText,
      spaceType: analysis.spaceType,
      analysis: analysis as object,
      status: "GENERATING",
    },
  });

  return NextResponse.json(
    {
      id: studioSession.id,
      spaceType: analysis.spaceType,
      summary: analysis.summary,
      needsSpecialist: analysis.needsSpecialist,
      // Only what the customer needs to see — editPrompt stays server-side so
      // it can't be tampered with before the render call.
      styles: analysis.styles.map(({ key, label, blurb, scope, costMinPence, costMaxPence, durationDays }) => ({
        key,
        label,
        blurb,
        scope,
        costMinPence,
        costMaxPence,
        durationDays,
      })),
      remainingThisMonth: Math.max(0, MONTHLY_FREE_SESSIONS - usedThisMonth - 1),
    },
    { status: 201 }
  );
}
