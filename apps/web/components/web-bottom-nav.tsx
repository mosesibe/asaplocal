"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Activity, PlusCircle, Wrench, User } from "lucide-react";
import { BottomNav, BottomNavItem } from "@asaplocal/ui";
import type { Session } from "next-auth";

export function WebBottomNav({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const accountHref = session?.user ? "/dashboard" : "/login";
  const activityHref = session?.user ? "/activity" : "/login?callbackUrl=/activity";

  return (
    <BottomNav className="md:hidden inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] rounded-[28px] border-t-0 border border-border/30 bg-surface/80 px-2 pb-0 shadow-xl backdrop-blur-xl">
      <BottomNavItem as={Link} href="/" icon={Home} label="Home" active={pathname === "/"} />
      <BottomNavItem as={Link} href={activityHref} icon={Activity} label="Activity" active={pathname.startsWith("/activity")} />
      <BottomNavItem
        as={Link}
        href="/jobs/new"
        icon={PlusCircle}
        label="Post a job"
        emphasized
        active={pathname.startsWith("/jobs/new")}
      />
      <BottomNavItem as={Link} href="/search" icon={Wrench} label="Services" active={pathname.startsWith("/search")} />
      <BottomNavItem
        as={Link}
        href={accountHref}
        icon={User}
        label="Account"
        active={pathname.startsWith("/dashboard") || pathname.startsWith("/login")}
      />
    </BottomNav>
  );
}
