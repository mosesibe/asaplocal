"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "./utils";

/**
 * Full-screen image viewer. Controlled by `index` (null = closed) so a single
 * viewer can page through a whole set — a job's photos, or every concept in a
 * Redesign Studio session. Keyboard (Esc/←/→) and swipe both work, and it is
 * portalled to <body> so a transformed or overflow-hidden ancestor (cards,
 * sheets) can never clip it.
 */
export function ImageLightbox({
  images,
  index,
  onIndexChange,
  label = "Image",
}: {
  images: string[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  /** Describes the set, e.g. "Photos of the space" — used for the dialog's accessible name. */
  label?: string;
}) {
  const count = images.length;
  const open = index !== null && index >= 0 && index < count;
  const touchStartX = useRef<number | null>(null);

  const close = useCallback(() => onIndexChange(null), [onIndexChange]);
  const prev = useCallback(() => {
    if (index !== null) onIndexChange((index - 1 + count) % count);
  }, [index, count, onIndexChange]);
  const next = useCallback(() => {
    if (index !== null) onIndexChange((index + 1) % count);
  }, [index, count, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft" && count > 1) prev();
      if (e.key === "ArrowRight" && count > 1) next();
    }
    document.addEventListener("keydown", onKey);
    // Don't let the page scroll behind the overlay.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, count, close, prev, next]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={close}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (start === null || end === undefined || count < 2) return;
        if (end - start > 50) prev();
        if (start - end > 50) next();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X size={20} />
      </button>

      {count > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          aria-label="Previous image"
          className="absolute left-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-6"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[index]}
        alt={`${label} — ${index + 1} of ${count}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-lg object-contain"
      />

      {count > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          aria-label="Next image"
          className="absolute right-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-6"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {count > 1 && (
        <p className="absolute bottom-5 text-sm text-white/80">
          {index + 1} / {count}
        </p>
      )}
    </div>,
    document.body
  );
}

/** A row of thumbnails; clicking one opens the whole set in the lightbox at that image. */
export function ImageGallery({
  images,
  label = "Photos",
  className,
  thumbClassName,
}: {
  images: string[];
  label?: string;
  className?: string;
  thumbClassName?: string;
}) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  if (images.length === 0) return null;

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {images.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setOpenAt(i)}
            aria-label={`View ${label.toLowerCase()} — ${i + 1} of ${images.length}`}
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className={cn(
                "h-20 w-20 cursor-zoom-in rounded-lg border border-border object-cover transition-opacity hover:opacity-90",
                thumbClassName
              )}
            />
          </button>
        ))}
      </div>
      <ImageLightbox images={images} index={openAt} onIndexChange={setOpenAt} label={label} />
    </>
  );
}

/** A single image that opens full-size when clicked. */
export function ZoomableImage({ src, alt, className, buttonClassName }: { src: string; alt: string; className?: string; buttonClassName?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View full size: ${alt}`}
        className={cn(
          "block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          buttonClassName
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={cn("cursor-zoom-in transition-opacity hover:opacity-95", className)} />
      </button>
      <ImageLightbox images={[src]} index={open ? 0 : null} onIndexChange={(i) => setOpen(i !== null)} label={alt} />
    </>
  );
}
