"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, Users, Flag, ListTree, CreditCard, Truck, ClipboardCheck, RefreshCcw, ShieldCheck, type LucideIcon } from "lucide-react";
import { LogoMark, Avatar, Badge, ThemeToggle, Sheet, SheetContent, SheetTitle, cn } from "@asaplocal/ui";
import { SignOutButton } from "./sign-out-button";
import type { Role } from "@asaplocal/db";

type NavItem = { href: string; label: string; icon: LucideIcon };

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Financial dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/verification", label: "Verification queue", icon: ShieldCheck },
  { href: "/moderation", label: "Moderation", icon: Flag },
  { href: "/categories", label: "Categories", icon: ListTree },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/refunds", label: "Lead refunds", icon: RefreshCcw },
  { href: "/dispatcher", label: "Dispatch board", icon: Truck },
  { href: "/approvals", label: "Approval queue", icon: ClipboardCheck },
];

const DISPATCHER_NAV: NavItem[] = [{ href: "/dispatcher", label: "Dispatch board", icon: Truck }];

const ROLE_LABEL: Partial<Record<Role, string>> = { ADMIN: "Administrator", DISPATCHER: "Dispatcher" };

function NavLinks({ nav, pathname, onNavigate }: { nav: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-brand-700 text-white shadow-sm" : "text-white/55 hover:bg-white/5 hover:text-white/85"
            )}
          >
            <Icon size={18} className={active ? "text-white" : "text-white/40"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  role,
  displayName,
  email,
  nav,
  pathname,
  onNavigate,
}: {
  role: Role;
  displayName: string;
  email?: string | null;
  nav: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <LogoMark className="h-8 w-8" />
        <span className="text-base font-extrabold tracking-tight text-white">
          Asap<span className="text-brand-300">Local</span>
        </span>
      </div>
      <div className="flex items-center gap-3 border-y border-white/10 px-5 py-4">
        <Avatar name={displayName} size={36} className="bg-brand-500/25 text-brand-100" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{displayName}</p>
          {email && <p className="truncate text-xs text-white/45">{email}</p>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">
          {role === "ADMIN" ? "Admin menu" : "Dispatch menu"}
        </p>
        <NavLinks nav={nav} pathname={pathname} onNavigate={onNavigate} />
      </div>
      <div className="shrink-0 border-t border-white/10 p-3">
        <SignOutButton />
      </div>
    </div>
  );
}

export function AdminShell({
  role,
  name,
  email,
  children,
}: {
  role: Role;
  name?: string | null;
  email?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const nav = role === "ADMIN" ? ADMIN_NAV : DISPATCHER_NAV;
  const displayName = name && name !== email ? name : (email?.split("@")[0] ?? "Staff");
  const roleLabel = ROLE_LABEL[role] ?? role;

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 shrink-0 bg-brand-900 lg:block">
        <SidebarContent role={role} displayName={displayName} email={email} nav={nav} pathname={pathname} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-0 bg-brand-900 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent
            role={role}
            displayName={displayName}
            email={email}
            nav={nav}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="hidden sm:inline-flex">{roleLabel}</Badge>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
