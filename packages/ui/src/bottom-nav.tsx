import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./utils";

export function BottomNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch justify-around border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]",
        className
      )}
      {...props}
    />
  );
}

interface BottomNavItemOwnProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  emphasized?: boolean;
  as?: React.ElementType;
  className?: string;
  [key: string]: unknown;
}

export function BottomNavItem({
  icon: Icon,
  label,
  active,
  emphasized,
  as: Comp = "a",
  className,
  ...props
}: BottomNavItemOwnProps) {
  return (
    <Comp
      className={cn(
        "flex min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground transition-colors",
        active && !emphasized && "text-brand-600",
        className
      )}
      {...props}
    >
      {emphasized ? (
        <span
          className={cn(
            "-mt-6 flex h-11 w-11 items-center justify-center rounded-full shadow-card transition-colors",
            active ? "bg-brand-700 text-white" : "bg-brand-600 text-white"
          )}
        >
          <Icon size={22} />
        </span>
      ) : (
        <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      )}
      <span className={cn("text-[11px] font-medium", emphasized && "text-muted-foreground")}>{label}</span>
    </Comp>
  );
}
