import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { UserRowActions } from "./user-row-actions";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;

  const users = await prisma.user.findMany({
    where: q ? { email: { contains: q, mode: "insensitive" } } : {},
    include: { profile: true, business: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <form className="mt-4" action="/users">
        <input name="q" defaultValue={q} placeholder="Search by email…" className="w-full max-w-sm rounded-lg border border-border bg-background p-2.5 text-sm" />
      </form>
      <div className="mt-6 space-y-2">
        {users.map((u) => (
          <Card key={u.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{u.email} {u.business && `— ${u.business.name}`}</p>
              <p className="text-xs text-muted-foreground">{u.role} · joined {u.createdAt.toLocaleDateString("en-GB")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={u.status === "ACTIVE" ? "success" : u.status === "SUSPENDED" ? "destructive" : "outline"}>{u.status}</Badge>
              {u.business && <Badge variant={u.business.verificationStatus === "VERIFIED" ? "success" : "warning"}>{u.business.verificationStatus}</Badge>}
              <UserRowActions userId={u.id} status={u.status} businessId={u.business?.id} verificationStatus={u.business?.verificationStatus} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
