"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { AccountDrawer } from "@/components/account-drawer";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/lib/nav";

const NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

function pageTitle(pathname: string): string {
  const match = NAV.find(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
  if (match) return match.label;
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  if (!segment) return "AsapLocal";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

interface ProviderTopBarProps {
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
}

export function ProviderTopBar({ canHaveStaff, ...props }: ProviderTopBarProps) {
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
        <h1 className="truncate text-xl font-bold">{pageTitle(pathname)}</h1>
      </div>

      <AccountDrawer open={drawerOpen} onOpenChange={setDrawerOpen} canHaveStaff={canHaveStaff} {...props} />
    </>
  );
}
