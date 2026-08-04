/** Brand mark: rounded terracotta badge with a bold "A" glyph and a peach accent dot. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="12" className="fill-brand-500" />
      <path
        d="M12 27L18.5 12h3.2L28 27h-3.6l-1.4-3.6h-6L15.6 27H12zm5-6.4h4.3L19.1 15l-2.1 5.6z"
        fill="white"
      />
      <circle cx="29.5" cy="12" r="3" className="fill-brand-200" />
    </svg>
  );
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
