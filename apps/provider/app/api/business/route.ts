import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { stripHtml } from "@asaplocal/core";
import { z } from "zod";

const workingHoursDay = z.object({ open: z.string(), close: z.string() }).nullable();
const workingHoursSchema = z.object({
  mon: workingHoursDay,
  tue: workingHoursDay,
  wed: workingHoursDay,
  thu: workingHoursDay,
  fri: workingHoursDay,
  sat: workingHoursDay,
  sun: workingHoursDay,
});

const schema = z.object({
  description: z.string().min(20).optional(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  phone: z.string().max(30).optional(),
  website: z.string().url().optional(),
  baseRadiusMiles: z.coerce.number().int().min(1).max(100).optional(),
  photoUrls: z.array(z.string().url()).optional(),
  languagesSpoken: z.array(z.string()).optional(),
  emergencyCalloutsAvailable: z.boolean().optional(),
  workingHours: workingHoursSchema.optional(),
  targetResponseMins: z.coerce.number().int().min(1).max(1440).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 422 });
  const data = parsed.data;

  // Consider the profile "complete" once the core Phase-10 fields are set.
  const hasCoreProfileFields =
    (data.photoUrls ?? business.photoUrls).length > 0 &&
    (data.languagesSpoken ?? business.languagesSpoken).length > 0 &&
    (data.workingHours ?? business.workingHours) != null;

  const updated = await prisma.business.update({
    where: { id: business.id },
    data: {
      ...data,
      description: data.description ? stripHtml(data.description) : undefined,
      workingHours: data.workingHours as any,
      profileCompletedAt: hasCoreProfileFields ? new Date() : undefined,
    },
  });

  return NextResponse.json({ business: updated });
}
