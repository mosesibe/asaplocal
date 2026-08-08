import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, placeDetails } from "@asaplocal/core";

export async function GET(req: NextRequest, { params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = await params;
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await checkRateLimit("geo-place-details", ip, 60, 300);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const resolved = await placeDetails(placeId).catch(() => null);
  if (!resolved) {
    return NextResponse.json({ message: "Couldn't resolve that address." }, { status: 404 });
  }
  return NextResponse.json(resolved);
}
