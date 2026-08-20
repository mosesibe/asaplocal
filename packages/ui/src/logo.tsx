/** Brand mark: the AsapLocal mascot badge (fixed multi-tone artwork, not theme-tinted). */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static brand asset, not a Next/Image candidate
  return <img src="/logo-mark.svg" alt="" className={`shrink-0 object-contain ${className}`} />;
}

/** Full lockup: mark + wordmark, "Asap" in espresso, "Local" in brand terracotta. */
export function Logo({ className, markClassName = "h-8 w-8" }: { className?: string; markClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-extrabold tracking-tight ${className ?? ""}`}>
      <LogoMark className={markClassName} />
      <span className="text-espresso-900 dark:text-espresso-50">
        Asap<span className="text-brand-500 dark:text-brand-300">Local</span>
      </span>
    </span>
  );
}
