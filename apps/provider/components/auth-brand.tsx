import Link from "next/link";
import { Logo } from "@asaplocal/ui";

/**
 * Brand lockup for the signed-out pages (login / register), mirroring the
 * sidebar's mark + "Business" qualifier so the provider app identifies itself
 * before a session exists — previously these pages carried no logo at all.
 */
export function AuthBrand() {
  return (
    <Link href="/login" aria-label="AsapLocal for Business" className="inline-flex items-baseline gap-2">
      <Logo markClassName="h-9 w-9" className="text-2xl" />
      <span className="text-sm font-normal text-muted-foreground">Business</span>
    </Link>
  );
}
