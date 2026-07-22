import type { MetadataRoute } from "next";
import { prisma } from "@asaplocal/db";

const CITIES = ["manchester", "london", "liverpool", "birmingham"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_WEB_URL ?? "https://asaplocal.app";
  const [categories, businesses] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true } }),
    prisma.business.findMany({ where: { verificationStatus: "VERIFIED" }, select: { slug: true, updatedAt: true } }),
  ]);

  const staticPages: MetadataRoute.Sitemap = ["", "/search", "/jobs/new", "/how-it-works", "/pricing"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));

  const seoPages: MetadataRoute.Sitemap = categories.flatMap((c) =>
    CITIES.map((city) => ({ url: `${base}/${c.slug}-${city}`, changeFrequency: "daily" as const, priority: 0.8 }))
  );

  const providerPages: MetadataRoute.Sitemap = businesses.map((b) => ({
    url: `${base}/providers/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...seoPages, ...providerPages];
}
