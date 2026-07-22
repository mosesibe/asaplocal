import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { ProviderCard } from "@/components/provider-card";

export default async function FavouritesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/favourites");

  const favourites = await prisma.favourite.findMany({
    where: { customerId: session.user.id },
    include: { business: { include: { services: { include: { category: true }, take: 1 } } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Your favourites</h1>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {favourites.map((f) => (
          <ProviderCard
            key={f.businessId}
            p={{
              slug: f.business.slug,
              name: f.business.name,
              logoUrl: f.business.logoUrl,
              city: f.business.city,
              avgRating: Number(f.business.avgRating),
              reviewCount: f.business.reviewCount,
              completedJobsCount: f.business.completedJobsCount,
              isFeatured: f.business.isFeatured,
              verificationStatus: f.business.verificationStatus,
              categoryName: f.business.services[0]?.category.name,
              fromPricePence: f.business.services[0]?.priceMinPence,
            }}
          />
        ))}
        {favourites.length === 0 && <p className="text-muted-foreground">You haven't saved any providers yet.</p>}
      </div>
    </div>
  );
}
