import Link from "next/link";

const categories = ["cleaners", "plumbers", "electricians", "gardeners", "handymen", "movers", "tutors", "pet-sitters"];
const cities = ["manchester", "london", "liverpool", "birmingham"];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h4 className="mb-3 text-sm font-semibold">Popular categories</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {categories.map((c) => (
                <li key={c}><Link href={`/${c}-manchester`} className="capitalize hover:underline">{c.replace("-", " ")}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Popular cities</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {cities.map((city) => (
                <li key={city}><Link href={`/plumbers-${city}`} className="capitalize hover:underline">Plumbers in {city}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about">About</Link></li>
              <li><Link href="/pricing">Provider pricing</Link></li>
              <li><Link href="/trust-safety">Trust &amp; safety</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/terms">Terms</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-10 text-xs text-muted-foreground">© {new Date().getFullYear()} AsapLocal. All rights reserved.</p>
      </div>
    </footer>
  );
}
