/**
 * Brand mark: the AsapLocal mascot badge (fixed multi-tone artwork, not
 * recoloured via CSS). Defaults to the single shared /logo-mark.svg; pass
 * srcLight/srcDark together for a mark with a dedicated variant per theme
 * (e.g. the provider app's navy mark for light backgrounds vs. its pale
 * mark for dark ones) — both render, toggled by the `dark` class via pure
 * CSS so there's no hydration mismatch or flash of the wrong variant.
 */
export function LogoMark({
  className = "h-8 w-8",
  srcLight = "/logo-mark.svg",
  srcDark = "/logo-mark.svg",
}: {
  className?: string;
  srcLight?: string;
  srcDark?: string;
}) {
  if (srcLight === srcDark) {
    // eslint-disable-next-line @next/next/no-img-element -- static brand asset, not a Next/Image candidate
    return <img src={srcLight} alt="" className={`shrink-0 object-contain ${className}`} />;
  }
  return (
    <span className={`relative inline-block shrink-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, not a Next/Image candidate */}
      <img src={srcLight} alt="" className="block h-full w-full object-contain dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, not a Next/Image candidate */}
      <img src={srcDark} alt="" className="hidden h-full w-full object-contain dark:block" />
    </span>
  );
}

/** Full lockup: mark + wordmark, "Asap" in espresso, "Local" in brand terracotta. */
export function Logo({
  className,
  markClassName = "h-8 w-8",
  markSrcLight,
  markSrcDark,
}: {
  className?: string;
  markClassName?: string;
  markSrcLight?: string;
  markSrcDark?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-extrabold tracking-tight ${className ?? ""}`}>
      <LogoMark className={markClassName} srcLight={markSrcLight} srcDark={markSrcDark} />
      <span className="text-espresso-900 dark:text-espresso-50">
        Asap<span className="text-brand-500 dark:text-brand-300">Local</span>
      </span>
    </span>
  );
}
