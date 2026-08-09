import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { stripHtml, geocodeAddress } from "@asaplocal/core";

const schema = z.object({
  label: z.string().max(60).optional(),
  addressLine: z.string().min(1, "Add an address"),
  city: z.string().min(2),
  postcode: z.string().max(12).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  // Sole traders trade from a single place — that's the primary address on the
  // business record, so there's nothing for this table to hold.
  if (business.businessType === "SOLE_TRADER") {
    return NextResponse.json({ message: "Sole traders have a single trading address — update it on your profile." }, { status: 409 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  const data = parsed.data;

  // The picker supplies coordinates when a lookup result was chosen; fall back
  // to geocoding for the manual-entry path so every address stays mappable.
  let { lat, lng } = data;
  if (lat == null || lng == null) {
    const geo = await geocodeAddress(`${data.addressLine} ${data.postcode ?? ""} ${data.city}, UK`).catch(() => null);
    lat = geo?.lat;
    lng = geo?.lng;
  }

  const address = await prisma.businessAddress.create({
    data: {
      businessId: business.id,
      label: data.label ? stripHtml(data.label) : undefined,
      addressLine: stripHtml(data.addressLine),
      city: stripHtml(data.city),
      postcode: data.postcode ? stripHtml(data.postcode) : undefined,
      lat,
      lng,
    },
  });

  return NextResponse.json({ address }, { status: 201 });
}
