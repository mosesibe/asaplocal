"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Avatar, Badge, cn, Logo, LogoMark, ThemeToggle } from "@asaplocal/ui";
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

/**
 * Navigation by width:
 *   - below md (phones): ProviderTopBar's menu + ProviderBottomNav
 *   - md to lg (tablets): a narrow icon-only rail, so a portrait tablet keeps
 *     most of its width for content
 *   - lg and up: the full sidebar with labels, account card and sub-pages
 */
export function ProviderShell({ children, account }: { children: React.ReactNode; account: AccountSummary }) {
  const pathname = usePathname();
  const NAV = [...PRIMARY_NAV, ...SECONDARY_NAV].filter((item) => account.canHaveStaff || item.href !== "/staff");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden shrink-0 flex-col border-r border-border bg-surface md:flex md:w-[4.5rem] md:px-2 md:py-4 lg:w-64 lg:p-4">
        <div className="mb-6 flex flex-col items-center gap-3 lg:mb-8 lg:flex-row lg:justify-between">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="AsapLocal Business home">
            {/* The wordmark doesn't fit the rail, so the rail shows the mark alone. */}
            <span className="lg:hidden">
              <LogoMark className="h-7 w-7" srcLight="/logo-mark-light.png" srcDark="/logo-mark-dark.png" />
            </span>
            <span className="hidden lg:inline-flex">
              <Logo markClassName="h-7 w-7" markSrcLight="/logo-mark-light.png" markSrcDark="/logo-mark-dark.png" />
            </span>
            <span className="hidden text-sm font-normal text-muted-foreground lg:inline">Business</span>
          </Link>
          <div className="flex flex-col items-center gap-1 lg:flex-row">
            {/* Sidebar sits on the left edge, so the panel opens rightwards over the page. */}
            <NotificationBell userId={account.userId} align="left" />
          </div>
        </div>

        {/* Rail: avatar only. Full sidebar: the account card. */}
        <Link href="/profile" title={account.name} className="mb-4 flex justify-center lg:hidden" aria-label={`Business profile — ${account.name}`}>
          <Avatar src={account.avatarUrl} name={account.name} size={36} />
        </Link>
        <div className="mb-6 hidden rounded-xl border border-border bg-muted/40 p-3 lg:block">
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

        <nav className="space-y-1" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon, children }) => {
            const active = isActive(pathname, href);
            // A group expands whenever the user is anywhere inside it, so the
            // sub-pages stay reachable without an extra click.
            const inSection = children ? children.some((c) => isActive(pathname, c.href)) || active : false;
            return (
              <div key={href}>
                <Link
                  href={href}
                  // The rail has no room for labels, so the label doubles as a hover tooltip there.
                  title={label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:justify-center lg:justify-start",
                    active || inSection ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="md:sr-only lg:not-sr-only">{label}</span>
                </Link>
                {children && inSection && (
                  <div className="ml-4 mt-1 hidden space-y-0.5 border-l border-border pl-3 lg:block">
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

        {/* Theme sits with sign-out rather than in the header: at lg the header
            row (logo + wordmark + "Business" + bell + toggle) outgrew the
            256px sidebar and pushed the toggle out over the page. */}
        <div className="mt-8 hidden items-center gap-2 lg:flex">
          <div className="flex-1">
            <SignOutButton />
          </div>
          <ThemeToggle />
        </div>
        <div className="mt-6 flex flex-col items-center gap-1 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            aria-label="Sign out"
            className="flex justify-center rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut size={18} />
          </button>
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
