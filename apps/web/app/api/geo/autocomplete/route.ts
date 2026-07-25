import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, placeAutocomplete } from "@asaplocal/core";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await checkRateLimit("geo-autocomplete", ip, 60, 300);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const input = req.nextUrl.searchParams.get("input")?.trim() ?? "";
  if (input.length < 3) return NextResponse.json({ predictions: [] });

  const predictions = await placeAutocomplete(input).catch(() => null);
  if (predictions === null) {
    return NextResponse.json({ message: "Address lookup is unavailable right now." }, { status: 503 });
  }
  return NextResponse.json({ predictions });
}
