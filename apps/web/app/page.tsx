import { prisma } from "@asaplocal/db";
import { HomepageAiSection } from "@/components/homepage-ai-section";
import { CategoryFlyerCarousel } from "@/components/category-flyer-carousel";
import { PopularCategories } from "@/components/popular-categories";

export default async function HomePage() {
  const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const topLevelCategories = categories.filter((c) => !c.parentId);

  return (
    <div>
      <HomepageAiSection categories={categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId }))} />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="mb-6 text-2xl font-semibold">Popular categories</h2>
        <PopularCategories categories={topLevelCategories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon }))} />
      </section>

      <section className="py-4">
        <h2 className="mb-6 px-4 text-2xl font-semibold sm:px-6">Explore services</h2>
        <CategoryFlyerCarousel categories={topLevelCategories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon }))} />
      </section>
    </div>
  );
}
