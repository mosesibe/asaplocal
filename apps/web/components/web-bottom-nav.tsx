"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, MessageSquare, User } from "lucide-react";
import { BottomNav, BottomNavItem } from "@asaplocal/ui";
import type { Session } from "next-auth";

export function WebBottomNav({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const accountHref = session?.user ? "/dashboard" : "/login";

  return (
    <BottomNav className="md:hidden">
      <BottomNavItem as={Link} href="/" icon={Home} label="Home" active={pathname === "/"} />
      <BottomNavItem as={Link} href="/search" icon={Search} label="Search" active={pathname.startsWith("/search")} />
      <BottomNavItem
        as={Link}
        href="/jobs/new"
        icon={PlusCircle}
        label="Post a job"
        emphasized
        active={pathname.startsWith("/jobs/new")}
      />
      <BottomNavItem
        as={Link}
        href="/messages"
        icon={MessageSquare}
        label="Messages"
        active={pathname.startsWith("/messages")}
      />
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
