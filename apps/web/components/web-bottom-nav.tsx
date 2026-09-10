"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Activity, PlusCircle, Wrench, User } from "lucide-react";
import { BottomNavNotched } from "@asaplocal/ui";
import type { Session } from "next-auth";

export function WebBottomNav({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const accountHref = session?.user ? "/dashboard" : "/login";
  const activityHref = session?.user ? "/activity" : "/login?callbackUrl=/activity";

  return (
    <BottomNavNotched
      as={Link}
      className="md:hidden"
      items={[
        { icon: Home, label: "Home", href: "/", active: pathname === "/" },
        { icon: Activity, label: "Activity", href: activityHref, active: pathname.startsWith("/activity") },
        { icon: PlusCircle, label: "Post a job", href: "/jobs/new", emphasized: true, active: pathname.startsWith("/jobs/new") },
        { icon: Wrench, label: "Services", href: "/search", active: pathname.startsWith("/search") },
        {
          icon: User,
          label: "Account",
          href: accountHref,
          active: pathname.startsWith("/dashboard") || pathname.startsWith("/login"),
        },
      ]}
    />
  );
}
