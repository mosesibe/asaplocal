import { headers } from "next/headers";

/**
 * Cities with pre-rendered SEO landing pages (see app/[slug]/page.tsx's
 * generateStaticParams). Coordinates are city centres, only precise enough
 * for "which of these four is nearest" — not for anything else.
 */
export const SUPPORTED_CITIES = [
  { slug: "manchester", name: "Manchester", lat: 53.4808, lng: -2.2426 },
  { slug: "london", name: "London", lat: 51.5074, lng: -0.1278 },
  { slug: "liverpool", name: "Liverpool", lat: 53.4084, lng: -2.9916 },
  { slug: "birmingham", name: "Birmingham", lat: 52.4862, lng: -1.8904 },
] as const;

/**
 * Visitor's approximate coordinates straight from Vercel's IP-geolocation
 * headers — unlike SUPPORTED_CITIES' city-centre points, precise enough for
 * a "within N miles" radius filter. Only present on Vercel's network; local
 * dev and other hosts get null (callers fall back to no location filter).
 */
export async function resolveVisitorLatLng(): Promise<{ lat: number; lng: number } | null> {
  const h = await headers();
  const lat = parseFloat(h.get("x-vercel-ip-latitude") ?? "");
  const lng = parseFloat(h.get("x-vercel-ip-longitude") ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}
