"use client";

import { useState } from "react";
import { Home, Activity, PlusCircle, Wrench, User } from "lucide-react";
import { BottomNav, BottomNavItem, BottomNavNotched } from "@asaplocal/ui";

/**
 * Side-by-side design review — current bottom nav vs. a dark, notched-center
 * alternate — toggled live rather than as static images so it's a true
 * preview of the real fixed-position bar. Not linked from anywhere in the
 * live app; visit directly at /design/nav-preview. Delete once the team has
 * picked one — this route only exists for the comparison.
 */
export default function NavPreviewPage() {
  const [variant, setVariant] = useState<"current" | "notched">("current");

  return (
    <div className="min-h-screen bg-background p-6 pb-32">
      <h1 className="text-2xl font-bold">Bottom nav — design review</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Same icons, same brand colors, same destinations on both — only the visual treatment differs. Toggle below;
        the bar itself renders fixed at the bottom of the screen either way.
      </p>

      <div className="mt-6 inline-flex rounded-full border border-border bg-surface p-1">
        <button
          onClick={() => setVariant("current")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            variant === "current" ? "bg-brand-600 text-white" : "text-muted-foreground"
          }`}
        >
          Current
        </button>
        <button
          onClick={() => setVariant("notched")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            variant === "notched" ? "bg-brand-600 text-white" : "text-muted-foreground"
          }`}
        >
          New concept (dark, notched)
        </button>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Showing: <span className="font-semibold text-foreground">{variant === "current" ? "Current nav" : "New concept"}</span>
      </p>

      {variant === "current" ? (
        <BottomNav className="inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] rounded-[28px] border-t-0 border border-border/30 bg-surface/80 px-2 pb-0 shadow-xl backdrop-blur-xl">
          <BottomNavItem as="span" icon={Home} label="Home" active />
          <BottomNavItem as="span" icon={Activity} label="Activity" />
          <BottomNavItem as="span" icon={PlusCircle} label="Post a job" emphasized />
          <BottomNavItem as="span" icon={Wrench} label="Services" />
          <BottomNavItem as="span" icon={User} label="Account" />
        </BottomNav>
      ) : (
        <BottomNavNotched
          items={[
            { icon: Home, label: "Home", href: "#home", active: true },
            { icon: Activity, label: "Activity", href: "#activity" },
            { icon: Wrench, label: "Services", href: "#services" },
            { icon: User, label: "Account", href: "#account" },
          ]}
          center={{ icon: PlusCircle, href: "#post-a-job" }}
        />
      )}
    </div>
  );
}
