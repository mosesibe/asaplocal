import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { PortfolioManager } from "./portfolio-manager";

export default async function PortfolioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { portfolioItems: { orderBy: { createdAt: "desc" } }, services: { include: { category: true } } },
  });
  if (!business) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Portfolio</h1>
      <p className="mt-1 text-muted-foreground">Show off completed projects — before/after photos, videos, and descriptions.</p>
      <PortfolioManager
        categories={business.services.map((s) => ({ id: s.category.id, name: s.category.name }))}
        items={business.portfolioItems.map((i) => ({
          id: i.id,
          title: i.title,
          description: i.description,
          beforeUrl: i.beforeUrl,
          afterUrl: i.afterUrl,
          videoUrl: i.videoUrl,
          photoUrls: i.photoUrls,
        }))}
      />
    </div>
  );
}
