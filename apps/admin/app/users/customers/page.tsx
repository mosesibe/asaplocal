import { Prisma, prisma } from "@asaplocal/db";
import { UserTable, type UserTableRow } from "@/components/user-table";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;

  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    business: null,
    providerSince: null,
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { profile: { firstName: { contains: q, mode: "insensitive" } } },
            { profile: { lastName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    include: { profile: true },
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
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Customers</h1>
      <p className="mt-1 text-sm text-muted-foreground">Everyone signed up to book services on AsapLocal.</p>
      <form className="mt-4" action="/users/customers">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          className="w-full max-w-sm rounded-lg border border-border bg-background p-2.5 text-sm"
        />
      </form>
      <UserTable users={rows} />
    </div>
  );
}
