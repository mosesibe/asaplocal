"use client";

import { ImageGallery } from "@asaplocal/ui";

/**
 * Thumbnails for a job-sheet entry's (or variation's / dispute's) photos,
 * opening the shared full-screen viewer. Kept as a thin wrapper so the
 * booking page's call sites stay unchanged.
 */
export function JobPhotoGallery({ photos, label }: { photos: string[]; label: string }) {
  return <ImageGallery images={photos} label={`Photos: ${label}`} className="mt-2" />;
}
