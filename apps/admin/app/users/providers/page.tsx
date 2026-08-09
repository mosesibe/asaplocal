import Link from "next/link";
import { Prisma, prisma, type BusinessType } from "@asaplocal/db";
import { Button } from "@asaplocal/ui";
import { UserTable, type UserTableRow } from "@/components/user-table";
import { AutoSubmitSelect } from "@/components/auto-submit-select";

const BUSINESS_TYPES = [
  { value: "SOLE_TRADER", label: "Sole Trader" },
  { value: "LIMITED_COMPANY", label: "Limited Company" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "CHARITY", label: "Charity" },
];

function buildOrderBy(sort: string | undefined, dir: "asc" | "desc"): Prisma.UserOrderByWithRelationInput[] {
  switch (sort) {
    case "name":
      return [{ profile: { firstName: dir } }, { profile: { lastName: dir } }];
    case "email":
      return [{ email: dir }];
    case "lastLoginAt":
      return [{ lastLoginAt: dir }];
    case "status":
      return [{ status: dir }];
    case "city":
      return [{ business: { city: dir } }];
    case "businessType":
      return [{ business: { businessType: dir } }];
    default:
      return [{ createdAt: dir }];
  }
}

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; businessType?: string; sort?: string; dir?: string }>;
}) {
  const { q, city, businessType, sort, dir: dirParam } = await searchParams;
  const dir: "asc" | "desc" = dirParam === "desc" ? "desc" : "asc";

  const isProvider: Prisma.UserWhereInput = {
    OR: [{ role: "PROVIDER" }, { business: { isNot: null } }, { providerSince: { not: null } }],
  };
  const matchesSearch: Prisma.UserWhereInput | undefined = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { profile: { firstName: { contains: q, mode: "insensitive" } } },
          { profile: { lastName: { contains: q, mode: "insensitive" } } },
          { business: { name: { contains: q, mode: "insensitive" } } },
        ],
      }
    : undefined;
  const matchesFilters: Prisma.UserWhereInput | undefined =
    city || businessType
      ? { business: { ...(city ? { city } : {}), ...(businessType ? { businessType: businessType as BusinessType } : {}) } }
      : undefined;

  const where: Prisma.UserWhereInput = {
    AND: [isProvider, matchesSearch, matchesFilters].filter(Boolean) as Prisma.UserWhereInput[],
  };

  const [users, cities] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { profile: true, business: { select: { id: true, city: true, businessType: true } } },
      orderBy: buildOrderBy(sort, dir),
      take: 100,
    }),
    prisma.business.findMany({ distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } }),
  ]);

  const rows: UserTableRow[] = users.map((u) => ({
    id: u.id,
    name: u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : (u.name ?? "—"),
    email: u.email,
    phone: u.phone,
    postcode: u.profile?.postcode ?? null,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    emailVerified: u.emailVerified,
    status: u.status,
    businessId: u.business?.id,
    city: u.business?.city,
    businessType: u.business?.businessType,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Providers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Businesses and tradespeople offering services on AsapLocal.</p>
        </div>
        <Link href="/users/providers/new">
          <Button size="sm">New provider</Button>
        </Link>
      </div>
      <form action="/users/providers" className="mt-4 flex flex-wrap items-center gap-2">
        {sort && <input type="hidden" name="sort" value={sort} />}
        {dirParam && <input type="hidden" name="dir" value={dirParam} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, or business…"
          className="h-11 min-w-[240px] flex-1 rounded-lg border border-border bg-background px-4 text-sm"
        />
        <AutoSubmitSelect name="city" defaultValue={city ?? ""} className="h-11 w-auto">
          <option value="">All regions</option>
          {cities.map((c) => (
            <option key={c.city} value={c.city}>{c.city}</option>
          ))}
        </AutoSubmitSelect>
        <AutoSubmitSelect name="businessType" defaultValue={businessType ?? ""} className="h-11 w-auto">
          <option value="">All business types</option>
          {BUSINESS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </AutoSubmitSelect>
      </form>
      <UserTable
        users={rows}
        basePath="/users/providers"
        params={{ q, city, businessType }}
        sort={sort}
        dir={dir}
        showBusinessColumns
      />
    </div>
  );
}
