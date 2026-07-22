import Link from "next/link";
import { prisma } from "@asaplocal/db";
import { Button, Card } from "@asaplocal/ui";
import { ProviderCard } from "@/components/provider-card";

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
      <section className="bg-gradient-to-b from-brand-50 to-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Find trusted local pros, fast</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Post a job and let vetted cleaners, plumbers, electricians and more come to you — or browse and book directly.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/jobs/new"><Button size="lg">Post a job for free</Button></Link>
            <Link href="/search"><Button size="lg" variant="outline">Browse providers</Button></Link>
          </div>
        </div>
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
