import Link from "next/link";
import { BottomNav, BottomNavItem } from "@asaplocal/ui";
import { PRIMARY_NAV } from "@/lib/nav";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ProviderBottomNav({ pathname }: { pathname: string }) {
  return (
    <BottomNav className="md:hidden">
      {PRIMARY_NAV.map(({ href, label, icon }) => (
        <BottomNavItem key={href} as={Link} href={href} icon={icon} label={label} active={isActive(pathname, href)} />
      ))}
    </BottomNav>
  );
}
