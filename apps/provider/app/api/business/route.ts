import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { stripHtml, recomputeTrustTier, writeAuditLog } from "@asaplocal/core";
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
  name: z.string().min(2).max(200).optional(),
  tradingName: z.string().max(200).optional(),
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

// JSON counterpart to /profile (a server component that queries Prisma
// directly) — needed for the mobile app's profile screen, which has no
// server component to fetch this in.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { addresses: { orderBy: { createdAt: "asc" } } },
  });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  return NextResponse.json({
    name: business.name,
    tradingName: business.tradingName ?? "",
    description: business.description ?? "",
    logoUrl: business.logoUrl ?? "",
    coverImageUrl: business.coverImageUrl ?? "",
    phone: business.phone ?? "",
    website: business.website ?? "",
    baseRadiusMiles: business.baseRadiusMiles,
    photoUrls: business.photoUrls,
    languagesSpoken: business.languagesSpoken,
    emergencyCalloutsAvailable: business.emergencyCalloutsAvailable,
    workingHours: (business.workingHours as any) ?? null,
    targetResponseMins: business.targetResponseMins ?? undefined,
    businessType: business.businessType,
    primaryAddress: {
      addressLine: business.addressLine,
      city: business.city,
      postcode: business.postcode,
    },
    addresses: business.addresses.map((a) => ({
      id: a.id,
      label: a.label,
      addressLine: a.addressLine,
      city: a.city,
      postcode: a.postcode,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  // A bare domain like "mybusiness.co.uk" (no protocol) is the most common
  // real-world input here and would otherwise fail z.string().url() silently.
  if (body && typeof body.website === "string" && body.website.trim() && !/^https?:\/\//i.test(body.website.trim())) {
    body.website = `https://${body.website.trim()}`;
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 422 });
  const data = parsed.data;

  // Consider the profile "complete" once the core Phase-10 fields are set.
  const hasCoreProfileFields =
    (data.photoUrls ?? business.photoUrls).length > 0 &&
    (data.languagesSpoken ?? business.languagesSpoken).length > 0 &&
    (data.workingHours ?? business.workingHours) != null;

  const nextName = data.name ? stripHtml(data.name) : undefined;
  // A registered business's name is what Companies House / manual-document
  // verification was checked against — changing it invalidates that check,
  // so renaming resets verification rather than silently keeping a stale pass.
  const nameChanged = nextName !== undefined && nextName !== business.name;

  const updated = await prisma.business.update({
    where: { id: business.id },
    data: {
      ...data,
      name: nextName,
      tradingName: data.tradingName ? stripHtml(data.tradingName) : undefined,
      description: data.description ? stripHtml(data.description) : undefined,
      workingHours: data.workingHours as any,
      profileCompletedAt: hasCoreProfileFields ? new Date() : undefined,
      ...(nameChanged ? { verificationStatus: "UNVERIFIED" as const, verifiedAt: null } : {}),
    },
  });

  if (nameChanged) {
    await recomputeTrustTier(business.id);
    await writeAuditLog({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "business.renamed_unverified",
      targetType: "Business",
      targetId: business.id,
      metadata: { from: business.name, to: nextName },
    });
  }

  // ServiceArea rows are seeded once at onboarding with that day's
  // baseRadiusMiles and never touched again — without this they drift from
  // whatever radius the provider sets here, and since lead matching and the
  // dashboard map both prefer a service area's own radius when one exists,
  // a stale wider row keeps surfacing leads (and drawing a circle) beyond
  // the radius the provider thinks they've set.
  if (data.baseRadiusMiles !== undefined) {
    await prisma.serviceArea.updateMany({ where: { businessId: business.id }, data: { radiusMiles: data.baseRadiusMiles } });
  }

  return NextResponse.json({ business: updated, verificationReset: nameChanged });
}
