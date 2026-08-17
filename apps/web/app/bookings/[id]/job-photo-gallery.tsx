"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Thumbnails for a job-sheet entry's photos, opening a full-screen slideshow.
 *
 * Takes a flat list plus the index to open at, so a booking with several
 * entries can share one continuous slideshow across all of them rather than
 * trapping the customer inside a single entry.
 */
export function JobPhotoGallery({ photos, label }: { photos: string[]; label: string }) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  const close = useCallback(() => setOpenAt(null), []);
  const prev = useCallback(() => setOpenAt((i) => (i === null ? null : (i - 1 + photos.length) % photos.length)), [photos.length]);
  const next = useCallback(() => setOpenAt((i) => (i === null ? null : (i + 1) % photos.length)), [photos.length]);

  useEffect(() => {
    if (openAt === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    document.addEventListener("keydown", onKey);
    // Don't let the page scroll behind the overlay.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [openAt, close, prev, next]);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {photos.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenAt(i)}
            aria-label={`View photo ${i + 1} of ${photos.length} for ${label}`}
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-20 w-20 rounded-lg border border-border object-cover transition-opacity hover:opacity-90" />
          </button>
        ))}
      </div>

      {openAt !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photos for ${label}`}
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X size={20} />
          </button>

          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Previous photo"
              className="absolute left-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-6"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[openAt]}
            alt={`Photo ${openAt + 1} of ${photos.length}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />

          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Next photo"
              className="absolute right-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-6"
            >
              <ChevronRight size={24} />
            </button>
          )}

          <p className="absolute bottom-5 text-sm text-white/80">
            {openAt + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  );
}
