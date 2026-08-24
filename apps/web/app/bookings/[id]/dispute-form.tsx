"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";

export function DisputeForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadPhotos(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setUploading(true);
    setError(null);
    const results = await Promise.allSettled(images.map((f) => uploadFile(f, "dispute-photo")));
    const urls = results.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled").map((r) => r.value);
    const failures = results.length - urls.length;
    if (urls.length > 0) setPhotos((p) => [...p, ...urls]);
    if (failures > 0) setError(`${failures} photo${failures > 1 ? "s" : ""} failed to upload`);
    setUploading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 10) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), photos }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Couldn't submit your issue");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Report an issue
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <label className="text-sm font-medium">What's wrong?</label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. The tap is still leaking, and there's a scratch on the worktop that wasn't there before"
          className="mt-1"
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const f = Array.from(e.target.files ?? []);
          e.target.value = "";
          await uploadPhotos(f);
        }}
      />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDrop={async (e) => { e.preventDefault(); setDragging(false); await uploadPhotos(Array.from(e.dataTransfer.files)); }}
        onClick={() => fileRef.current?.click()}
        className={`flex flex-wrap items-center gap-2 rounded-lg border-2 border-dashed p-3 transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
      >
        {photos.map((url) => (
          <div key={url} className="relative" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />
            <button type="button" onClick={() => setPhotos((p) => p.filter((u) => u !== url))} aria-label="Remove photo" className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs text-white">×</button>
          </div>
        ))}
        {photos.length === 0 && !uploading && (
          <p className="text-sm text-muted-foreground">Drag and drop photos showing the problem, or click to browse</p>
        )}
        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
          {uploading ? "Uploading…" : "Add photos"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading || reason.trim().length < 10}>
          {loading ? "Submitting…" : "Submit issue"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
