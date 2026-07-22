import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_WEB_URL ?? "https://asaplocal.app";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard/", "/bookings/", "/jobs/*/", "/account-suspended"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
