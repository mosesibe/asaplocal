import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "./utils";
import { buttonVariants } from "./button";

export function MobileTopBar({
  title,
  backHref,
  onBack,
  linkAs: LinkComp = "a",
  right,
  className,
}: {
  title?: string;
  backHref?: string;
  onBack?: () => void;
  linkAs?: React.ElementType;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface/90 px-2 pt-[env(safe-area-inset-top)] backdrop-blur",
        className
      )}
    >
      {backHref ? (
        <LinkComp href={backHref} aria-label="Back" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ChevronLeft size={22} />
        </LinkComp>
      ) : onBack ? (
        <button type="button" aria-label="Back" onClick={onBack} className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ChevronLeft size={22} />
        </button>
      ) : (
        <span className="w-10" />
      )}
      {title && <span className="flex-1 truncate text-base font-semibold">{title}</span>}
      {!title && <span className="flex-1" />}
      {right && <div className="flex items-center gap-1 pr-1">{right}</div>}
    </div>
  );
}
