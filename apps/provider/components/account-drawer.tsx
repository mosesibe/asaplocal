"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { Avatar, Badge, Sheet, SheetContent } from "@asaplocal/ui";
import { SECONDARY_NAV } from "@/lib/nav";
import { SignOutButton } from "./sign-out-button";

interface AccountDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email: string;
  avatarUrl?: string | null;
  city: string;
  verificationStatus: string;
  trustTier: string;
}

export function AccountDrawer({ open, onOpenChange, name, email, avatarUrl, city, verificationStatus, trustTier }: AccountDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Avatar src={avatarUrl} name={name} size={48} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
            <p className="truncate text-xs text-muted-foreground">{city}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 border-b border-border py-3">
          <Badge variant="outline">{trustTier} tier</Badge>
          <Badge variant={verificationStatus === "VERIFIED" ? "success" : "warning"}>{verificationStatus}</Badge>
        </div>

        <nav className="mt-2 flex-1 space-y-1">
          {SECONDARY_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
          <Link
            href="/account"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Settings size={18} /> Account settings
          </Link>
        </nav>

        <div className="border-t border-border pt-4">
          <SignOutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
