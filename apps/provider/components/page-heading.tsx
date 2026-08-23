import { cn } from "@asaplocal/ui";

/**
 * A page's own <h1>, hidden on mobile.
 *
 * ProviderTopBar renders the page title from the nav config, but only below md
 * — on desktop the sidebar is visible instead and there is no top bar. So a
 * page that also renders a plain <h1> shows its title twice on a phone. Using
 * this keeps exactly one visible heading at every width, and leaves screen
 * readers with one too (the hidden copy is display:none, not just invisible).
 *
 * Pages whose heading differs from the nav label — a lead's job title, or
 * "Add a staff member" under "Staff" — should use a plain <h1> instead; they
 * are not duplicates and are worth showing on mobile.
 */
export function PageHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h1 className={cn("hidden text-2xl font-bold md:block", className)}>{children}</h1>;
}
