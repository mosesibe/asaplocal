import { redirect } from "next/navigation";
import { prisma } from "@asaplocal/db";
import { Badge } from "@asaplocal/ui";
import { auth } from "@asaplocal/auth";
import { StaffRowActions } from "./staff-row-actions";

const STATUS_VARIANT: Record<string, "success" | "destructive" | "outline" | "warning"> = {
  ACTIVE: "success",
  SUSPENDED: "destructive",
  DEACTIVATED: "outline",
  PENDING_VERIFICATION: "warning",
};

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");
  const { q } = await searchParams;

  const staff = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "DISPATCHER"] },
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { profile: { firstName: { contains: q, mode: "insensitive" } } },
              { profile: { lastName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { profile: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Staff</h1>
      <p className="mt-1 text-sm text-muted-foreground">Admins and dispatchers with access to this portal.</p>
      <form className="mt-4" action="/users/staff">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          className="w-full max-w-sm rounded-lg border border-border bg-background p-2.5 text-sm"
        />
      </form>

      <div className="mt-6 overflow-x-auto rounded-none border border-border">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Date joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staff.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="whitespace-nowrap px-4 py-3 font-medium">
                  {u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : (u.name ?? "—")}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.phone ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Badge variant="secondary">{u.role}</Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {u.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Badge variant={STATUS_VARIANT[u.status] ?? "outline"}>{u.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <StaffRowActions userId={u.id} role={u.role} status={u.status} isSelf={u.id === session.user.id} />
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No staff accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
