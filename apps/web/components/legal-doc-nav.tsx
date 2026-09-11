import Link from "next/link";
import { cn } from "@asaplocal/ui";

const LEGAL_DOCS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/terms/professionals", label: "Professional Terms" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/community", label: "Community, Reviews & Safety" },
] as const;

export function LegalDocNav({ current }: { current: (typeof LEGAL_DOCS)[number]["href"] }) {
  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-6 text-sm" aria-label="Legal documents">
      {LEGAL_DOCS.map((doc) => (
        <Link
          key={doc.href}
          href={doc.href}
          aria-current={doc.href === current ? "page" : undefined}
          className={cn(
            "rounded-full px-3 py-1.5 font-medium transition-colors",
            doc.href === current
              ? "bg-brand-600 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {doc.label}
        </Link>
      ))}
    </nav>
  );
}
