import Link from "next/link";
import type { Session } from "next-auth";
import { Search, MessageSquare } from "lucide-react";
import { Button, Logo } from "@asaplocal/ui";
import { NotificationBell } from "./notification-bell";

export function SiteHeader({ session }: { session: Session | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="AsapLocal home">
          <Logo markClassName="h-8 w-8" markSrcLight="/logo-mark-light.png" markSrcDark="/logo-mark-dark.png" />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/search"><Button variant="ghost" size="icon" aria-label="Search"><Search size={20} /></Button></Link>
          <Link href={session?.user ? "/messages" : "/login?callbackUrl=/messages"}>
            <Button variant="ghost" size="icon" aria-label="Messages"><MessageSquare size={20} /></Button>
          </Link>
          {session?.user && <NotificationBell userId={session.user.id} />}
        </div>
      </div>
    </header>
  );
}
