"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Activity, ChevronDown, Heart, LogOut, Sparkles, User } from "lucide-react";
import { Avatar, cn } from "@asaplocal/ui";

/** The large-screen counterpart to WebBottomNav's items — keep the two in step. */
function primaryLinks(signedIn: boolean) {
  return [
    { href: "/", label: "Home", isActive: (p: string) => p === "/" },
    {
      href: signedIn ? "/activity" : "/login?callbackUrl=/activity",
      label: "Activity",
      isActive: (p: string) => p.startsWith("/activity"),
    },
    { href: "/search", label: "Services", isActive: (p: string) => p.startsWith("/search") || p.startsWith("/providers") },
    { href: "/studio", label: "Redesign Studio", isActive: (p: string) => p.startsWith("/studio") },
  ];
}

export function DesktopNavLinks({ signedIn, className }: { signedIn: boolean; className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className={cn("items-center gap-1", className)}>
      {primaryLinks(signedIn).map(({ href, label, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

const ACCOUNT_LINKS = [
  { href: "/dashboard", label: "My account", icon: User },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/studio/designs", label: "My designs", icon: Sparkles },
  { href: "/favourites", label: "Saved providers", icon: Heart },
];

/** Avatar button opening the signed-in customer's account menu. */
export function AccountMenu({
  name,
  email,
  image,
  className,
}: {
  name: string;
  email: string | null;
  image: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on navigation, outside click and Escape.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-1 rounded-full p-1 pr-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Avatar src={image} name={name} size={32} />
        <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-card"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold">{name}</p>
            {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
          </div>
          {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <Icon size={16} className="text-muted-foreground" />
              {label}
            </Link>
          ))}
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
          >
            <LogOut size={16} className="text-muted-foreground" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
