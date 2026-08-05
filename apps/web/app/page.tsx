import Link from "next/link";
import { prisma } from "@asaplocal/db";
import { Card } from "@asaplocal/ui";
import { HomepageAiSection } from "@/components/homepage-ai-section";
import { CategoryFlyerCarousel } from "@/components/category-flyer-carousel";

export default async function HomePage() {
  const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const topLevelCategories = categories.filter((c) => !c.parentId);

  return (
    <div>
      <HomepageAiSection categories={categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId }))} />

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
