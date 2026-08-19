import { headers } from "next/headers";
import { milesBetween } from "@asaplocal/core";

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

export const DEFAULT_CITY_SLUG = "manchester";

/**
 * Picks the nearest supported city from Vercel's IP-geolocation headers, so
 * homepage category links land on a relevant local SEO page instead of
 * always Manchester. Those headers are only present on Vercel's network —
 * local dev and other hosts fall back to the default.
 */
export async function resolveNearestCitySlug(): Promise<string> {
  const h = await headers();
  const lat = parseFloat(h.get("x-vercel-ip-latitude") ?? "");
  const lng = parseFloat(h.get("x-vercel-ip-longitude") ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lng)) return DEFAULT_CITY_SLUG;

  let nearestSlug: string = DEFAULT_CITY_SLUG;
  let nearestMiles = Infinity;
  for (const city of SUPPORTED_CITIES) {
    const miles = milesBetween(lat, lng, city.lat, city.lng);
    if (miles < nearestMiles) {
      nearestMiles = miles;
      nearestSlug = city.slug;
    }
  }
  return nearestSlug;
}
