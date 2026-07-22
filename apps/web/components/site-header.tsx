import Link from "next/link";
import type { Session } from "next-auth";
import { Button, ThemeToggle } from "@asaplocal/ui";

export function SiteHeader({ session }: { session: Session | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-xl font-bold text-brand-700">
          Local<span className="text-brand-500">Connect</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/search">Find a pro</Link>
          <Link href="/jobs/new">Post a job</Link>
          <Link href="/how-it-works">How it works</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden items-center gap-2 md:flex">
            {session?.user ? (
              <>
                <Link href="/favourites"><Button variant="ghost" size="sm">Favourites</Button></Link>
                <Link href="/dashboard"><Button size="sm">My account</Button></Link>
              </>
            ) : (
              <>
                <Link href="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
                <Link href="/register"><Button size="sm">Sign up</Button></Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
