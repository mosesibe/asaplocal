import Link from "next/link";
import { LayoutDashboard, Users, Flag, ListTree, CreditCard, Truck, ClipboardCheck, RefreshCcw } from "lucide-react";
import { SignOutButton } from "./sign-out-button";
import type { Role } from "@asaplocal/db";

const ADMIN_NAV = [
  { href: "/dashboard", label: "Financial dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/moderation", label: "Moderation", icon: Flag },
  { href: "/categories", label: "Categories", icon: ListTree },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/refunds", label: "Lead refunds", icon: RefreshCcw },
  { href: "/dispatcher", label: "Dispatch board", icon: Truck },
  { href: "/approvals", label: "Approval queue", icon: ClipboardCheck },
];

const DISPATCHER_NAV = [
  { href: "/dispatcher", label: "Dispatch board", icon: Truck },
];

export function AdminShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const nav = role === "ADMIN" ? ADMIN_NAV : DISPATCHER_NAV;
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface p-4 md:block">
        <Link href="/" className="mb-8 block text-xl font-bold text-brand-700">
          Local<span className="text-brand-500">Connect</span> <span className="text-sm font-normal text-muted-foreground">{role === "ADMIN" ? "Admin" : "Dispatch"}</span>
        </Link>
        <nav className="space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-8"><SignOutButton /></div>
      </aside>
      <main className="mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
