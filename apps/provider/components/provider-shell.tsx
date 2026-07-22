"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, ThemeToggle } from "@asaplocal/ui";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/lib/nav";
import { SignOutButton } from "./sign-out-button";
import { ProviderBottomNav } from "./provider-bottom-nav";

const NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ProviderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface p-4 md:block">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-brand-700">
            Local<span className="text-brand-500">Connect</span> <span className="text-sm font-normal text-muted-foreground">Business</span>
          </Link>
          <ThemeToggle />
        </div>
        <nav className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon size={18} /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </aside>
      <div className="flex-1">
        <main className="mx-auto max-w-6xl px-4 py-8 pb-20 sm:px-6 md:pb-8">{children}</main>
      </div>
      <ProviderBottomNav pathname={pathname} />
    </div>
  );
}
