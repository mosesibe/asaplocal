import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { SuppliesManager } from "./supplies-manager";

export default async function SuppliesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: {
      supplies: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      services: { where: { isActive: true }, include: { category: true } },
    },
  });
  if (!business) redirect("/onboarding");

  const trades = [...new Set(business.services.map((s) => s.category.name))];

  return (
    <div>
      <h1 className="text-2xl font-bold">Supplies</h1>
      <p className="mt-1 text-muted-foreground">
        Products you sell alongside your work — parts, materials, consumables. These show on your public listing so customers
        know they can get them from you.
      </p>
      {trades.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Keep these relevant to your trades: <span className="text-foreground">{trades.join(", ")}</span>.
        </p>
      )}
      <div className="mt-6">
        <SuppliesManager
          supplies={business.supplies.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            pricePence: s.pricePence,
            unit: s.unit,
            imageUrl: s.imageUrl,
            inStock: s.inStock,
          }))}
        />
      </div>
    </div>
  );
}
