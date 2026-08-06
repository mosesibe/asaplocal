import { Prisma, prisma } from "@asaplocal/db";
import { Badge } from "@asaplocal/ui";
import { ListToolbar } from "@/components/list-toolbar";
import { Pagination } from "@/components/pagination";
import { ServiceRowActions } from "./service-row-actions";
import { NewServiceDialog } from "./new-service-dialog";

const PAGE_SIZE = 20;

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.CategoryWhereInput = q ? { name: { contains: q, mode: "insensitive" } } : {};

  const [categories, totalCount] = await Promise.all([
    prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.category.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-2xl font-bold">Services</h1>
      <p className="mt-1 text-sm text-muted-foreground">The category/service taxonomy providers list under and customers search by.</p>

      <ListToolbar basePath="/operations/services" q={q} searchPlaceholder="Search by name…" addNew={<NewServiceDialog />} />

      <div className="mt-4 overflow-x-auto rounded-none border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{c.parentId ? <span className="pl-4 text-muted-foreground">↳ </span> : null}{c.name}</td>
                <td className="px-4 py-3">
                  <Badge variant={c.isActive ? "success" : "outline"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <ServiceRowActions category={{ id: c.id, name: c.name, isActive: c.isActive, isFeatured: c.isFeatured, isRegulatedTrade: c.isRegulatedTrade }} />
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                  No services found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} basePath="/operations/services" searchParams={{ q }} />
      </div>
    </div>
  );
}
