import { prisma } from "@asaplocal/db";
import { milesBetween } from "@asaplocal/core";
import { ProviderCard } from "@/components/provider-card";
import { SearchFiltersContainer } from "./search-filters-container";

interface SearchParams {
  category?: string;
  city?: string;
  minRating?: string;
  minPrice?: string;
  maxPrice?: string;
  lat?: string;
  lng?: string;
  radius?: string;
}

export const metadata = { title: "Search local service providers" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const categories = await prisma.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { name: "asc" } });

  const minRating = sp.minRating ? Number(sp.minRating) : undefined;
  const minPrice = sp.minPrice ? Number(sp.minPrice) * 100 : undefined;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) * 100 : undefined;
  const radius = sp.radius ? Number(sp.radius) : 25;
  const lat = sp.lat ? Number(sp.lat) : undefined;
  const lng = sp.lng ? Number(sp.lng) : undefined;

  let businesses = await prisma.business.findMany({
    where: {
      ...(sp.city ? { city: { equals: sp.city, mode: "insensitive" } } : {}),
      ...(minRating ? { avgRating: { gte: minRating } } : {}),
      verificationStatus: { in: ["VERIFIED", "PENDING"] },
      services: {
        some: {
          isActive: true,
          ...(sp.category ? { category: { slug: sp.category } } : {}),
          ...(minPrice ? { priceMinPence: { gte: minPrice } } : {}),
          ...(maxPrice ? { priceMaxPence: { lte: maxPrice } } : {}),
        },
      },
    },
    include: { services: { include: { category: true }, take: 1 } },
    orderBy: [{ isFeatured: "desc" }, { avgRating: "desc" }],
    take: 40,
  });

  if (lat !== undefined && lng !== undefined) {
    businesses = businesses.filter((b) => milesBetween(lat, lng, Number(b.lat), Number(b.lng)) <= radius);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold">
        {sp.category ? categories.find((c) => c.slug === sp.category)?.name : "All providers"}
        {sp.city ? ` in ${sp.city}` : ""}
      </h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr] md:gap-8">
        <SearchFiltersContainer categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} initial={sp} />
        <div>
          <p className="mb-4 text-sm text-muted-foreground">{businesses.length} providers found</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
            {businesses.length === 0 && <p className="text-muted-foreground">No providers match your filters yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
