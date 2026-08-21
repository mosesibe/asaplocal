"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { AccountDrawer } from "@/components/account-drawer";
import { NotificationBell } from "@/components/notification-bell";
import { ALL_NAV_ITEMS } from "@/lib/nav";

const NAV = ALL_NAV_ITEMS;

function pageTitle(pathname: string): string {
  // Longest match wins — "/earnings/invoices" must not resolve to the parent
  // "/earnings" just because it appears first in the list.
  const match = NAV.filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`)).sort(
    (a, b) => b.href.length - a.href.length
  )[0];
  if (match) return match.label;
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  if (!segment) return "AsapLocal";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

interface ProviderTopBarProps {
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

export function ProviderTopBar({ canHaveStaff, userId, ...props }: ProviderTopBarProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div className="mb-6 flex items-center gap-3 md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-muted"
        >
          <Menu size={20} />
        </button>
        <h1 className="flex-1 truncate text-xl font-bold">{pageTitle(pathname)}</h1>
        <NotificationBell userId={userId} />
      </div>

      <AccountDrawer open={drawerOpen} onOpenChange={setDrawerOpen} canHaveStaff={canHaveStaff} {...props} />
    </>
  );
}
