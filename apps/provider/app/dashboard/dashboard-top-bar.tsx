"use client";

import { useState } from "react";
import { Menu, SlidersHorizontal } from "lucide-react";
import { AccountDrawer } from "@/components/account-drawer";

interface DashboardTopBarProps {
  name: string;
  email: string;
  avatarUrl?: string | null;
  city: string;
  verificationStatus: string;
  trustTier: string;
}

export function DashboardTopBar(props: DashboardTopBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-xl font-bold">Leads</h1>
        </div>
        <button
          type="button"
          aria-label="Filter"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      <AccountDrawer open={drawerOpen} onOpenChange={setDrawerOpen} {...props} />
    </>
  );
}
