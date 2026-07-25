import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { listUserAddresses, upsertUserAddress, geocodeAddress } from "@asaplocal/core";

const postSchema = z.object({
  addressLine: z.string().min(1),
  city: z.string().min(1),
  postcode: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const addresses = await listUserAddresses(session.user.id);
  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 422 });

  let { lat, lng } = parsed.data;
  if (lat === undefined || lng === undefined) {
    const geo = await geocodeAddress(`${parsed.data.addressLine} ${parsed.data.postcode ?? ""} ${parsed.data.city}, UK`).catch(() => null);
    if (!geo) return NextResponse.json({ message: "Could not locate that address" }, { status: 422 });
    lat = geo.lat;
    lng = geo.lng;
  }

  const address = await upsertUserAddress(session.user.id, { ...parsed.data, lat, lng });
  return NextResponse.json({ address }, { status: 201 });
}
