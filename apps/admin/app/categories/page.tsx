import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { NewCategoryForm } from "./new-category-form";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { services: true, jobRequests: true } } } });

  return (
    <div>
      <h1 className="text-2xl font-bold">Categories &amp; service types</h1>
      <div className="mt-6 max-w-md"><NewCategoryForm /></div>
      <div className="mt-8 space-y-2">
        {categories.map((c) => (
          <Card key={c.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c._count.services} listings · {c._count.jobRequests} job requests</p>
            </div>
            <Badge variant={c.isActive ? "success" : "outline"}>{c.isActive ? "Active" : "Inactive"}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
