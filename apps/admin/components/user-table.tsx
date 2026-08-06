import { Badge } from "@asaplocal/ui";
import { UserRowActions } from "./user-row-actions";

export type UserTableRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  postcode: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  emailVerified: Date | null;
  status: string;
  businessId?: string;
};

const STATUS_VARIANT: Record<string, "success" | "destructive" | "outline" | "warning"> = {
  ACTIVE: "success",
  SUSPENDED: "destructive",
  DEACTIVATED: "outline",
  PENDING_VERIFICATION: "warning",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function UserTable({ users }: { users: UserTableRow[] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-none border border-border">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Postcode</th>
            <th className="px-4 py-3">Reg. date</th>
            <th className="px-4 py-3">Last login</th>
            <th className="px-4 py-3">Verified</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-muted/30">
              <td className="whitespace-nowrap px-4 py-3 font-medium">{u.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.email}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.phone ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.postcode ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fmtDate(u.createdAt)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.lastLoginAt ? fmtDate(u.lastLoginAt) : "Never"}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge variant={u.emailVerified ? "success" : "warning"}>{u.emailVerified ? "Verified" : "Unverified"}</Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge variant={STATUS_VARIANT[u.status] ?? "outline"}>{u.status}</Badge>
              </td>
              <td className="px-4 py-3">
                <UserRowActions userId={u.id} status={u.status} businessId={u.businessId} />
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
