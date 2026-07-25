import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, reverseGeocode } from "@asaplocal/core";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await checkRateLimit("geo-reverse", ip, 20, 300);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid coordinates" }, { status: 422 });
  }

  const resolved = await reverseGeocode(parsed.data.lat, parsed.data.lng).catch(() => null);
  if (!resolved) {
    return NextResponse.json({ message: "Couldn't determine your address — please add it manually." }, { status: 404 });
  }
  return NextResponse.json(resolved);
}
