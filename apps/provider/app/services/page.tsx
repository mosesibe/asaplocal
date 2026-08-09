import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { ServicesManager } from "./services-manager";

export default async function ServicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: {
      services: { include: { category: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!business) redirect("/onboarding");

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Services</h1>
      <p className="mt-1 text-muted-foreground">
        The work you offer. Pause anything you're not taking on right now and it stops appearing in your lead marketplace.
      </p>
      <div className="mt-6">
        <ServicesManager
          services={business.services.map((s) => ({
            id: s.id,
            title: s.title,
            categoryName: s.category.name,
            isActive: s.isActive,
            durationMins: s.durationMins,
            aiSuggestedDurationMins: s.aiSuggestedDurationMins,
            priceType: s.priceType,
            priceMinPence: s.priceMinPence,
            priceMaxPence: s.priceMaxPence,
          }))}
          categories={categories}
          selectedCategoryIds={business.services.map((s) => s.categoryId)}
        />
      </div>
    </div>
  );
}
