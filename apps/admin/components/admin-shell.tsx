"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  LayoutDashboard,
  Users,
  User,
  Briefcase,
  UserCog,
  UserX,
  Flag,
  ListTree,
  CreditCard,
  Truck,
  ClipboardCheck,
  RefreshCcw,
  ShieldCheck,
  Wrench,
  Landmark,
  Banknote,
  Receipt,
  MessageSquare,
  Bell,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { LogoMark, Avatar, useTheme, cn } from "@asaplocal/ui";
import { Sheet, SheetContent, SheetTitle } from "@asaplocal/ui";
import { signOut } from "next-auth/react";
import { GlobalSearch } from "./global-search";
import type { Role } from "@asaplocal/db";

type NavItem = { href: string; label: string; icon: LucideIcon; children?: NavItem[] };

const USERS_GROUP_ADMIN: NavItem = {
  href: "/users",
  label: "Users",
  icon: Users,
  children: [
    { href: "/users/customers", label: "Customers", icon: User },
    { href: "/users/providers", label: "Providers", icon: Briefcase },
    { href: "/users/staff", label: "Staff", icon: UserCog },
    { href: "/users/deletion-requests", label: "Account Deletion", icon: UserX },
  ],
};

const USERS_GROUP_DISPATCHER: NavItem = {
  href: "/users",
  label: "Users",
  icon: Users,
  children: [
    { href: "/users/customers", label: "Customers", icon: User },
    { href: "/users/providers", label: "Providers", icon: Briefcase },
    { href: "/users/deletion-requests", label: "Account Deletion", icon: UserX },
  ],
};

const OPERATIONS_GROUP: NavItem = {
  href: "/operations",
  label: "Operations",
  icon: Wrench,
  children: [
    { href: "/operations/services", label: "Services", icon: ListTree },
    { href: "/operations/verification", label: "Verification queue", icon: ShieldCheck },
  ],
};

const FINANCE_GROUP: NavItem = {
  href: "/finance",
  label: "Finance",
  icon: Landmark,
  children: [
    { href: "/finance/subscriptions", label: "Subscriptions", icon: CreditCard },
    { href: "/finance/payouts", label: "Payouts", icon: Banknote },
    { href: "/finance/invoices", label: "Invoices", icon: Receipt },
  ],
};

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Financial dashboard", icon: LayoutDashboard },
  USERS_GROUP_ADMIN,
  OPERATIONS_GROUP,
  { href: "/moderation", label: "Moderation", icon: Flag },
  FINANCE_GROUP,
  { href: "/refunds", label: "Lead refunds", icon: RefreshCcw },
  { href: "/dispatcher", label: "Dispatch board", icon: Truck },
  { href: "/approvals", label: "Approval queue", icon: ClipboardCheck },
];

const DISPATCHER_NAV: NavItem[] = [USERS_GROUP_DISPATCHER, { href: "/dispatcher", label: "Dispatch board", icon: Truck }];

const ROLE_LABEL: Partial<Record<Role, string>> = { ADMIN: "Administrator", DISPATCHER: "Dispatcher" };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function activeGroupHref(nav: NavItem[], pathname: string): string | null {
  return nav.find((item) => item.children?.some((c) => isActive(pathname, c.href)))?.href ?? null;
}

function NavLinks({
  nav,
  pathname,
  collapsed,
  onNavigate,
}: {
  nav: NavItem[];
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const [openGroup, setOpenGroup] = React.useState<string | null>(() => activeGroupHref(nav, pathname));

  React.useEffect(() => {
    const active = activeGroupHref(nav, pathname);
    if (active) setOpenGroup(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <nav className="space-y-1">
      {nav.map((item) => {
        const { href, label, icon: Icon, children } = item;

        if (children && children.length > 0) {
          const childActive = children.some((c) => isActive(pathname, c.href));
          const open = !collapsed && openGroup === href;
          return (
            <div key={href}>
              <button
                type="button"
                title={collapsed ? label : undefined}
                onClick={() => setOpenGroup((g) => (g === href ? null : href))}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  childActive ? "text-white" : "text-white/55 hover:bg-white/5 hover:text-white/85"
                )}
              >
                <Icon size={18} className={cn("shrink-0", childActive ? "text-brand-300" : "text-white/40")} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{label}</span>
                    <ChevronDown size={14} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
                  </>
                )}
              </button>
              {open && (
                <div className="mt-0.5 space-y-0.5 border-l border-white/10 py-0.5 pl-3">
                  {children.map((c) => {
                    const cActive = isActive(pathname, c.href);
                    return (
                      <Link
                        key={c.href}
                        href={c.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                          cActive ? "bg-brand-700 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80"
                        )}
                      >
                        <c.icon size={15} className="shrink-0" />
                        {c.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
              collapsed && "justify-center px-0",
              active ? "bg-brand-700 text-white shadow-sm" : "text-white/55 hover:bg-white/5 hover:text-white/85"
            )}
          >
            <Icon size={18} className={cn("shrink-0", active ? "text-white" : "text-white/40")} />
            {!collapsed && label}
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
  collapsed,
  onNavigate,
}: {
  role: Role;
  displayName: string;
  email?: string | null;
  nav: NavItem[];
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 shrink-0 items-center gap-2.5 px-5", collapsed && "justify-center px-0")}>
        <LogoMark className="h-8 w-8 shrink-0" />
        {!collapsed && (
          <span className="text-base font-extrabold tracking-tight text-white">
            Asap<span className="text-brand-300">Local</span>
          </span>
        )}
      </div>
      <div className={cn("flex items-center gap-3 border-y border-white/10 px-5 py-4", collapsed && "justify-center px-0")}>
        <Avatar name={displayName} size={36} className="bg-brand-500/25 text-brand-100" />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
            {email && <p className="truncate text-xs text-white/45">{email}</p>}
          </div>
        )}
      </div>
      <div className={cn("flex-1 overflow-y-auto px-3 py-4", collapsed && "px-2")}>
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">
            {role === "ADMIN" ? "Admin menu" : "Dispatch menu"}
          </p>
        )}
        <NavLinks nav={nav} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
      <div className={cn("shrink-0 border-t border-white/10 p-3", collapsed && "px-2")}>
        <button
          type="button"
          title={collapsed ? "Sign out" : undefined}
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-white/55 transition-colors hover:bg-white/5 hover:text-white/85",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut size={18} className="shrink-0 text-white/40" />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </div>
  );
}

function ProfileMenu({ role, displayName, email }: { role: Role; displayName: string; email?: string | null }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  React.useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Account menu" aria-expanded={open}>
        <Avatar name={displayName} size={36} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-60 rounded-xl border border-border bg-surface p-1.5 shadow-card">
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
            <p className="mt-1 text-xs text-brand-600 dark:text-brand-300">{ROLE_LABEL[role] ?? role}</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminShell({
  role,
  name,
  email,
  pendingApprovals = 0,
  children,
}: {
  role: Role;
  name?: string | null;
  email?: string | null;
  pendingApprovals?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const nav = role === "ADMIN" ? ADMIN_NAV : DISPATCHER_NAV;
  const displayName = name && name !== email ? name : (email?.split("@")[0] ?? "Staff");

  function onMenuToggle() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setCollapsed((v) => !v);
    } else {
      setMobileOpen(true);
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden shrink-0 bg-brand-900 transition-[width] duration-200 lg:block",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <SidebarContent role={role} displayName={displayName} email={email} nav={nav} pathname={pathname} collapsed={collapsed} />
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

      <div className={cn("flex min-w-0 flex-1 flex-col transition-[padding] duration-200", collapsed ? "lg:pl-[68px]" : "lg:pl-64")}>
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={onMenuToggle}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <Menu size={20} />
          </button>

          <GlobalSearch />

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              title="Messages (not available yet)"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground/60 cursor-default"
            >
              <MessageSquare size={19} />
            </button>
            <Link
              href="/approvals"
              aria-label={pendingApprovals > 0 ? `${pendingApprovals} pending approvals` : "Approvals"}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <Bell size={19} />
              {pendingApprovals > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface" />
              )}
            </Link>
            <div className="ml-1">
              <ProfileMenu role={role} displayName={displayName} email={email} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
