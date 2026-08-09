import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
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
  city?: string | null;
  businessType?: string | null;
};

const STATUS_VARIANT: Record<string, "success" | "destructive" | "outline" | "warning"> = {
  ACTIVE: "success",
  SUSPENDED: "destructive",
  DEACTIVATED: "outline",
  PENDING_VERIFICATION: "warning",
};

const BUSINESS_TYPE_LABEL: Record<string, string> = {
  SOLE_TRADER: "Sole Trader",
  LIMITED_COMPANY: "Limited Company",
  PARTNERSHIP: "Partnership",
  SELF_EMPLOYED: "Self-employed",
  CHARITY: "Charity",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
}

export function UserTable({
  users,
  basePath,
  params = {},
  sort,
  dir = "asc",
  showBusinessColumns = false,
}: {
  users: UserTableRow[];
  /** Enables sortable column headers when provided — the page path to link back to. */
  basePath?: string;
  /** Current filter values to preserve when a sort link is clicked. */
  params?: Record<string, string | undefined>;
  sort?: string;
  dir?: "asc" | "desc";
  showBusinessColumns?: boolean;
}) {
  function sortHref(column: string) {
    if (!basePath) return "#";
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) usp.set(k, v);
    usp.set("sort", column);
    usp.set("dir", sort === column && dir === "asc" ? "desc" : "asc");
    return `${basePath}?${usp.toString()}`;
  }

  function SortIcon({ column }: { column: string }) {
    if (sort !== column) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  }

  const columns: Column[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "phone", label: "Phone" },
    ...(showBusinessColumns
      ? [
          { key: "city", label: "Region", sortable: true },
          { key: "businessType", label: "Business type", sortable: true },
        ]
      : [{ key: "postcode", label: "Postcode" }]),
    { key: "createdAt", label: "Reg. date", sortable: true },
    { key: "lastLoginAt", label: "Last login", sortable: true },
    { key: "emailVerified", label: "Verified" },
    { key: "status", label: "Status", sortable: true },
    { key: "actions", label: "Actions" },
  ];

  return (
    <div className="mt-6 overflow-x-auto rounded-none border border-border">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3">
                {col.sortable && basePath ? (
                  <Link href={sortHref(col.key)} className="inline-flex items-center gap-1 hover:text-foreground">
                    {col.label}
                    <SortIcon column={col.key} />
                  </Link>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-muted/30">
              <td className="whitespace-nowrap px-4 py-3 font-medium">{u.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.email}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.phone ?? "—"}</td>
              {showBusinessColumns ? (
                <>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.city ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {u.businessType ? (BUSINESS_TYPE_LABEL[u.businessType] ?? u.businessType) : "—"}
                  </td>
                </>
              ) : (
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.postcode ?? "—"}</td>
              )}
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
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
