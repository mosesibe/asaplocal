import * as React from "react";
import { cn } from "./utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

export function Avatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} style={style} className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <div
      style={style}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800",
        className
      )}
      aria-label={name}
    >
      {initials(name) || "?"}
    </div>
  );
}
