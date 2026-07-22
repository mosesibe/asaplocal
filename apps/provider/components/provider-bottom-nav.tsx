"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { BottomNav, BottomNavItem, Sheet, SheetContent, SheetHeader, SheetTitle, ThemeToggle } from "@asaplocal/ui";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/lib/nav";
import { SignOutButton } from "./sign-out-button";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ProviderBottomNav({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const inMore = SECONDARY_NAV.some((item) => isActive(pathname, item.href));

  return (
    <>
      <BottomNav className="md:hidden">
        {PRIMARY_NAV.map(({ href, label, icon }) => (
          <BottomNavItem key={href} as={Link} href={href} icon={icon} label={label} active={isActive(pathname, href)} />
        ))}
        <BottomNavItem
          as="button"
          type="button"
          onClick={() => setMoreOpen(true)}
          icon={MoreHorizontal}
          label="More"
          active={inMore}
        />
      </BottomNav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent>
          <SheetHeader className="flex-row items-center justify-between">
            <SheetTitle>More</SheetTitle>
            <ThemeToggle />
          </SheetHeader>
          <nav className="space-y-1">
            {SECONDARY_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
              >
                <Icon size={18} /> {label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-border pt-4">
            <SignOutButton />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
