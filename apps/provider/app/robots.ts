import type { MetadataRoute } from "next";
// Internal app — never indexed.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
