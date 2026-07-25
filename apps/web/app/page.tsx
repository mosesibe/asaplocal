import Link from "next/link";
import { prisma } from "@asaplocal/db";
import { Card } from "@asaplocal/ui";
import { AiJobRequest } from "@/components/ai-job-request";
import { CategoryFlyerCarousel } from "@/components/category-flyer-carousel";

export default async function HomePage() {
  const categories = await prisma.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <section className="bg-gradient-to-b from-brand-50 to-white px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">What do you need done?</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Describe the job in your own words — we'll match you with vetted local pros ASAP.
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

      <section className="py-4">
        <h2 className="mb-6 px-4 text-2xl font-semibold sm:px-6">Explore services</h2>
        <CategoryFlyerCarousel categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon }))} />
      </section>
    </div>
  );
}
