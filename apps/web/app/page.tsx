import Link from "next/link";
import { prisma } from "@asaplocal/db";
import { Card } from "@asaplocal/ui";
import { AiJobRequest } from "@/components/ai-job-request";
import { CategoryFlyerCarousel } from "@/components/category-flyer-carousel";

export default async function HomePage() {
  const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const topLevelCategories = categories.filter((c) => !c.parentId);

  return (
    <div>
      <section className="relative overflow-hidden bg-espresso-950 px-4 py-14 sm:px-6 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-900/40 via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-brand-50 sm:text-4xl">What do you need done?</h1>
          <p className="mt-3 text-lg text-espresso-200">
            Describe the job in your own words — we'll match you with vetted local pros ASAP.
          </p>
        </div>
        <div className="relative mt-8">
          <AiJobRequest categories={categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId }))} />
        </div>
        <p className="relative mt-4 text-center text-sm text-espresso-200">
          Prefer to look yourself? <Link href="/search" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">Browse providers directly</Link>
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="mb-6 text-2xl font-semibold">Popular categories</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {topLevelCategories.map((c) => (
            <Link key={c.id} href={`/${c.slug}-manchester`}>
              <Card className="p-5 text-center transition-shadow hover:border-brand-300 hover:shadow-accent dark:hover:border-brand-700">
                <p className="font-medium">{c.name}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-4">
        <h2 className="mb-6 px-4 text-2xl font-semibold sm:px-6">Explore services</h2>
        <CategoryFlyerCarousel categories={topLevelCategories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon }))} />
      </section>
    </div>
  );
}
