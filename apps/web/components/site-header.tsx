import Link from "next/link";
import type { Session } from "next-auth";
import { Search, MessageSquare } from "lucide-react";
import { Button } from "@asaplocal/ui";

export function SiteHeader({ session }: { session: Session | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-xl font-bold text-brand-700">
          Local<span className="text-brand-500">Connect</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/search"><Button variant="ghost" size="icon" aria-label="Search"><Search size={20} /></Button></Link>
          <Link href={session?.user ? "/messages" : "/login?callbackUrl=/messages"}>
            <Button variant="ghost" size="icon" aria-label="Messages"><MessageSquare size={20} /></Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
