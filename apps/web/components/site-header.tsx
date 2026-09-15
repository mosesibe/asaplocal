import Link from "next/link";
import type { Session } from "next-auth";
import { Search, MessageSquare, PlusCircle } from "lucide-react";
import { Button, Logo, buttonVariants, cn } from "@asaplocal/ui";
import { NotificationBell } from "./notification-bell";
import { AccountMenu, DesktopNavLinks } from "./site-header-nav";

/**
 * Below lg (phones and tablets) navigation lives in WebBottomNav, so this
 * stays a slim bar: search, messages and notifications. From lg the bottom
 * nav is hidden and this header carries the same destinations, a "Post a
 * job" button and the account menu (or log in / sign up) instead.
 */
export function SiteHeader({ session }: { session: Session | null }) {
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" aria-label="AsapLocal home">
            <Logo markClassName="h-8 w-8" markSrcLight="/logo-mark-light.png" markSrcDark="/logo-mark-dark.png" />
          </Link>
          <DesktopNavLinks signedIn={!!user} className="hidden lg:flex" />
        </div>
        <div className="flex items-center gap-1">
          <Link href="/jobs/new" className={cn(buttonVariants({ size: "sm" }), "mr-2 hidden gap-1.5 lg:inline-flex")}>
            <PlusCircle size={16} /> Post a job
          </Link>
          <Link href="/search"><Button variant="ghost" size="icon" aria-label="Search"><Search size={20} /></Button></Link>
          <Link href={user ? "/messages" : "/login?callbackUrl=/messages"}>
            <Button variant="ghost" size="icon" aria-label="Messages"><MessageSquare size={20} /></Button>
          </Link>
          {user && <NotificationBell userId={user.id} />}
          {user ? (
            <AccountMenu
              name={user.name ?? user.email ?? "My account"}
              email={user.email ?? null}
              image={user.image ?? null}
              className="ml-1 hidden lg:block"
            />
          ) : (
            <div className="ml-2 hidden items-center gap-2 lg:flex">
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Log in
              </Link>
              <Link href="/register" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
