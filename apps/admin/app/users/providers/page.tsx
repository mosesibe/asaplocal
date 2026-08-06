import { Prisma, prisma } from "@asaplocal/db";
import { UserTable, type UserTableRow } from "@/components/user-table";

export default async function ProvidersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;

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

  const users = await prisma.user.findMany({
    where: matchesSearch ? { AND: [isProvider, matchesSearch] } : isProvider,
    include: { profile: true, business: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

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
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Providers</h1>
      <p className="mt-1 text-sm text-muted-foreground">Businesses and tradespeople offering services on AsapLocal.</p>
      <form className="mt-4" action="/users/providers">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, or business…"
          className="w-full max-w-sm rounded-lg border border-border bg-background p-2.5 text-sm"
        />
      </form>
      <UserTable users={rows} />
    </div>
  );
}
