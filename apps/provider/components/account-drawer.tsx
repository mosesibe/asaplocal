"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { Avatar, Badge, Card, Logo, Sheet, SheetContent, SheetClose, ThemeToggle } from "@asaplocal/ui";
import { ACCOUNT_DRAWER_SECTIONS, DrawerPanelId } from "@/lib/nav";
import { SignOutButton } from "./sign-out-button";
import { AccountSettingsPanel } from "./account-settings-panel";

interface AccountDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  city: string;
  verificationStatus: string;
  trustTier: string;
  canHaveStaff: boolean;
}

const PANEL_TITLES: Record<DrawerPanelId, string> = {
  "account-settings": "Account settings",
  "help-center": "Help center",
  preferences: "Preferences",
};

const FAQ_ITEMS = [
  { q: "How do lead credits work?", a: "Each lead you unlock uses one credit from your wallet. Top up or manage your plan from Billing & credits." },
  { q: "How is my trust tier calculated?", a: "Your tier reflects your verification status, reviews, and completed jobs. Finish verification to move up a tier." },
  { q: "How do I change my service area?", a: "Update your service radius and areas from Business profile." },
  { q: "Who can I contact for support?", a: "Email support@asaplocal.pro and we'll get back to you within one business day." },
];

export function AccountDrawer({
  open,
  onOpenChange,
  name,
  email,
  firstName,
  lastName,
  avatarUrl,
  city,
  verificationStatus,
  trustTier,
  canHaveStaff,
}: AccountDrawerProps) {
  const [panel, setPanel] = useState<DrawerPanelId | null>(null);
  const drawerSections = ACCOUNT_DRAWER_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canHaveStaff || !("href" in item) || item.href !== "/staff"),
  }));

  function handleOpenChange(next: boolean) {
    if (!next) setPanel(null);
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="left" className="flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          {panel ? (
            <>
              <p className="font-semibold">{PANEL_TITLES[panel]}</p>
              <button
                type="button"
                onClick={() => setPanel(null)}
                aria-label="Back"
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none"
              >
                <ArrowLeft size={16} />
              </button>
            </>
          ) : (
            <>
              <Logo markClassName="h-7 w-7" />
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <SheetClose
                  aria-label="Close"
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none"
                >
                  <X size={16} />
                </SheetClose>
              </div>
            </>
          )}
        </div>

        {panel === null && (
          <>
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

            <div className="mt-3 flex-1 space-y-5 overflow-y-auto">
              {drawerSections.map((section) => (
                <div key={section.title}>
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</p>
                  <Card className="divide-y divide-border p-0">
                    {section.items.map((item) =>
                      "href" in item ? (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => handleOpenChange(false)}
                          className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                        >
                          <item.icon size={18} />
                          <span className="flex-1">{item.label}</span>
                          <ChevronRight size={16} className="text-muted-foreground" />
                        </Link>
                      ) : (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPanel(item.id)}
                          className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-muted"
                        >
                          <item.icon size={18} />
                          <span className="flex-1">
                            {item.label}
                            {item.subtitle && <span className="block text-xs font-normal text-muted-foreground">{item.subtitle}</span>}
                          </span>
                          <ChevronRight size={16} className="text-muted-foreground" />
                        </button>
                      )
                    )}
                  </Card>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4">
              <SignOutButton />
            </div>
          </>
        )}

        {panel === "account-settings" && (
          <div className="flex-1 overflow-y-auto">
            <AccountSettingsPanel firstName={firstName} lastName={lastName} email={email} avatarUrl={avatarUrl} />
          </div>
        )}

        {panel === "help-center" && (
          <div className="flex-1 space-y-4 overflow-y-auto">
            {FAQ_ITEMS.map((faq) => (
              <div key={faq.q}>
                <p className="text-sm font-medium">{faq.q}</p>
                <p className="mt-1 text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        )}

        {panel === "preferences" && (
          <div className="flex-1 overflow-y-auto">
            <p className="text-sm text-muted-foreground">Preferences are coming soon.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
