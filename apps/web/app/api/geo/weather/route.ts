import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getWeatherForecast } from "@asaplocal/core";

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await checkRateLimit("geo-weather", ip, 60, 300);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse({
    lat: req.nextUrl.searchParams.get("lat"),
    lng: req.nextUrl.searchParams.get("lng"),
    date: req.nextUrl.searchParams.get("date"),
  });
  if (!parsed.success) return NextResponse.json({ message: "Invalid parameters" }, { status: 422 });

  const forecast = await getWeatherForecast(parsed.data.lat, parsed.data.lng, parsed.data.date).catch(() => null);
  return NextResponse.json({ forecast });
}
