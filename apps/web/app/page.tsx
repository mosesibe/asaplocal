import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { listUserAddresses } from "@asaplocal/core";
import { InstallAppBanner } from "@asaplocal/ui";
import { HomepageAiSection } from "@/components/homepage-ai-section";
import { CategoryFlyerCarousel } from "@/components/category-flyer-carousel";
import { PopularCategories } from "@/components/popular-categories";
import { resolveVisitorLatLng } from "@/lib/supported-cities";

export default async function HomePage() {
  const session = await auth();

  const [categories, savedAddresses, visitorLocation] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    session?.user ? listUserAddresses(session.user.id) : Promise.resolve([]),
    resolveVisitorLatLng(),
  ]);
  const topLevelCategories = categories.filter((c) => !c.parentId);

  // Prefer a logged-in customer's most recent saved address over IP-geolocation
  // — more precise, and doesn't shift every time they browse from a new network.
  const location = savedAddresses[0]
    ? { lat: Number(savedAddresses[0].lat), lng: Number(savedAddresses[0].lng) }
    : visitorLocation;

  return (
    <div>
      <InstallAppBanner className="mx-auto max-w-7xl px-4 pt-4 sm:px-6" />

      <HomepageAiSection categories={categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId }))} />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="mb-6 text-2xl font-semibold">Popular categories</h2>
        <PopularCategories
          location={location}
          categories={topLevelCategories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon }))}
        />
      </section>

      <section className="py-4">
        <h2 className="mb-6 px-4 text-2xl font-semibold sm:px-6">Explore services</h2>
        <CategoryFlyerCarousel
          location={location}
          categories={topLevelCategories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon }))}
        />
      </section>
    </div>
  );
}
