import Link from "next/link";
import { prisma } from "@asaplocal/db";
import { Card } from "@asaplocal/ui";
import { ProviderCard } from "@/components/provider-card";
import { AiJobRequest } from "@/components/ai-job-request";

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { sortOrder: "asc" } }),
    prisma.business.findMany({
      where: { isFeatured: true, verificationStatus: "VERIFIED" },
      take: 6,
      include: { services: { include: { category: true }, take: 1 } },
    }),
  ]);

  return (
    <div>
      <section className="bg-gradient-to-b from-brand-50 to-white px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">What do you need done?</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Describe the job in your own words — we'll match you with vetted local pros.
          </p>
        </div>
        <div className="mt-8">
          <AiJobRequest categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Prefer to look yourself? <Link href="/search" className="font-medium text-brand-700 hover:underline">Browse providers directly</Link>
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="mb-6 text-2xl font-semibold">Popular categories</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.id} href={`/${c.slug}-manchester`}>
              <Card className="p-5 text-center hover:shadow-lg">
                <p className="font-medium">{c.name}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="mb-6 text-2xl font-semibold">Featured providers</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((biz) => (
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
          </div>
        </section>
      )}
    </div>
  );
}
