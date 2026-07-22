import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@asaplocal/db";
import { ProviderCard } from "@/components/provider-card";

/**
 * Local-SEO landing pages of the form /electricians-manchester,
 * /plumbers-london, /gardeners-liverpool. The category slug is matched
 * against known Category.slug values; whatever remains after stripping
 * "<categorySlug>-" is treated as the city.
 */
async function resolveSlug(slug: string) {
  const categories = await prisma.category.findMany({ where: { isActive: true } });
  const match = categories
    .filter((c) => slug.startsWith(`${c.slug}-`))
    .sort((a, b) => b.slug.length - a.slug.length)[0];
  if (!match) return null;
  const citySlug = slug.slice(match.slug.length + 1);
  if (!citySlug) return null;
  const cityName = citySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { category: match, citySlug, cityName };
}

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({ where: { isActive: true } });
  const cities = ["manchester", "london", "liverpool", "birmingham"];
  return categories.flatMap((c) => cities.map((city) => ({ slug: `${c.slug}-${city}` })));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveSlug(slug);
  if (!resolved) return {};
  const title = `${resolved.category.name} in ${resolved.cityName} | AsapLocal`;
  const description = `Compare vetted, reviewed ${resolved.category.name.toLowerCase()} in ${resolved.cityName}. Get free quotes and book online with AsapLocal.`;
  return {
    title,
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function CategoryCityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveSlug(slug);
  if (!resolved) notFound();

  const businesses = await prisma.business.findMany({
    where: {
      city: { equals: resolved.cityName, mode: "insensitive" },
      services: { some: { categoryId: resolved.category.id, isActive: true } },
      verificationStatus: { in: ["VERIFIED", "PENDING"] },
    },
    include: { services: { include: { category: true }, take: 1 } },
    orderBy: [{ isFeatured: "desc" }, { avgRating: "desc" }],
    take: 30,
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: businesses.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@type": "LocalBusiness", name: b.name, url: `${process.env.NEXT_PUBLIC_WEB_URL}/providers/${b.slug}` },
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/search">All providers</Link> / {resolved.category.name} / {resolved.cityName}
      </nav>
      <h1 className="text-3xl font-bold">{resolved.category.name} in {resolved.cityName}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Browse {businesses.length} vetted {resolved.category.name.toLowerCase()} serving {resolved.cityName}. Read verified
        reviews, compare pricing and message providers directly, or post a job and let them come to you.
      </p>
      <div className="mt-8 flex justify-end">
        <Link href={`/jobs/new?category=${resolved.category.slug}`} className="text-sm font-medium text-brand-700 hover:underline">
          Can't decide? Post a job instead →
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {businesses.map((biz) => (
          <ProviderCard
            key={biz.id}
            p={{
              slug: biz.slug,
              name: biz.name,
              logoUrl: biz.logoUrl,
              city: biz.city,
              avgRating: Number(biz.avgRating),
              reviewCount: biz.reviewCount,
              completedJobsCount: biz.completedJobsCount,
              isFeatured: biz.isFeatured,
              verificationStatus: biz.verificationStatus,
              categoryName: biz.services[0]?.category.name,
              fromPricePence: biz.services[0]?.priceMinPence,
            }}
          />
        ))}
        {businesses.length === 0 && (
          <p className="text-muted-foreground">
            No {resolved.category.name.toLowerCase()} listed in {resolved.cityName} yet —{" "}
            <Link href={`/jobs/new?category=${resolved.category.slug}`} className="text-brand-700 hover:underline">post a job</Link> and we'll notify providers nearby.
          </p>
        )}
      </div>
    </div>
  );
}
