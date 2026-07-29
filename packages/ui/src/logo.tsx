/** Brand mark: a monogram "A" (AsapLocal) on the terracotta badge used across favicons/app icons. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="asaplocal-badge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d97b3d" />
          <stop offset="1" stopColor="#9c4a20" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#asaplocal-badge)" />
      <path d="M32 15 L17 47" fill="none" stroke="#f3eae3" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 15 L45 47 L52 47" fill="none" stroke="#f3eae3" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23.5 35 L40.5 35" fill="none" stroke="#f3eae3" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  );
}

/** Full lockup: mark + wordmark, split between a dispatch-precise "ASAP" and a warm, neighbourly "local". */
export function Logo({ className, markClassName = "h-8 w-8" }: { className?: string; markClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark className={markClassName} />
      <span className="inline-flex items-baseline text-xl leading-none">
        <span className="font-mono font-bold tracking-wide text-espresso-900 dark:text-espresso-50">ASAP</span>
        <span className="font-serif italic font-medium text-brand-600 dark:text-brand-300">local</span>
      </span>
    </span>
  );
}
