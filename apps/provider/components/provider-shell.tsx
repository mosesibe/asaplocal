"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, Badge, cn, Logo, ThemeToggle } from "@asaplocal/ui";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/lib/nav";
import { VerificationStatusBadge } from "@/lib/verification-badge";
import { SignOutButton } from "./sign-out-button";
import { ProviderBottomNav } from "./provider-bottom-nav";
import { ProviderTopBar } from "./provider-top-bar";
import { NotificationBell } from "./notification-bell";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface AccountSummary {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  city: string;
  verificationStatus: string;
  trustTier: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  canHaveStaff: boolean;
  marketingEmail: boolean;
  marketingSms: boolean;
}

export function ProviderShell({ children, account }: { children: React.ReactNode; account: AccountSummary }) {
  const pathname = usePathname();
  const NAV = [...PRIMARY_NAV, ...SECONDARY_NAV].filter((item) => account.canHaveStaff || item.href !== "/staff");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface p-4 md:block">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo markClassName="h-7 w-7" />
            <span className="text-sm font-normal text-muted-foreground">Business</span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell userId={account.userId} />
            <ThemeToggle />
          </div>
        </div>
        <div className="mb-6 rounded-xl border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-3">
            <Avatar src={account.avatarUrl} name={account.name} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{account.name}</p>
              <p className="truncate text-xs text-muted-foreground">{account.email}</p>
              {account.phone && <p className="truncate text-xs text-muted-foreground">{account.phone}</p>}
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Badge variant={account.isEmailVerified ? "success" : "warning"}>Email {account.isEmailVerified ? "verified" : "unverified"}</Badge>
            {account.phone && (
              <Badge variant={account.isPhoneVerified ? "success" : "warning"}>Phone {account.isPhoneVerified ? "verified" : "unverified"}</Badge>
            )}
            <VerificationStatusBadge status={account.verificationStatus} />
          </div>
        </div>
        <nav className="space-y-1">
          {NAV.map(({ href, label, icon: Icon, children }) => {
            const active = isActive(pathname, href);
            // A group expands whenever the user is anywhere inside it, so the
            // sub-pages stay reachable without an extra click.
            const inSection = children ? children.some((c) => isActive(pathname, c.href)) || active : false;
            return (
              <div key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active || inSection ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon size={18} /> {label}
                </Link>
                {children && inSection && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                    {children.map((c) => {
                      // Exact match for the group's own index route, otherwise
                      // "/earnings" would highlight on every child page.
                      const childActive = c.href === href ? pathname === c.href : isActive(pathname, c.href);
                      return (
                        <Link
                          key={c.href}
                          href={c.href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                            childActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <c.icon size={15} /> {c.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl px-4 py-8 pb-20 sm:px-6 md:pb-8">
          <ProviderTopBar {...account} />
          {children}
        </main>
      </div>
      <ProviderBottomNav pathname={pathname} />
    </div>
  );
}
