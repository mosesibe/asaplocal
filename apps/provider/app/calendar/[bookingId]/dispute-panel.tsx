"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Textarea } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";

interface Dispute {
  id: string;
  reason: string;
  photos: string[];
  status: string;
  providerResponse: string | null;
  providerPhotos: string[];
  createdAt: string | Date;
}

export function DisputePanel({ bookingId, disputes }: { bookingId: string; disputes: Dispute[] }) {
  const router = useRouter();
  const [response, setResponse] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const open = disputes.find((d) => d.status === "OPEN");

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

  async function resolve(e: React.FormEvent) {
    e.preventDefault();
    if (response.trim().length < 5) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: response.trim(), photos }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Couldn't resolve the dispute");
      setResponse("");
      setPhotos([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="font-semibold">Reported issues</h2>

      <div className="mt-4 space-y-2">
        {disputes.map((dispute) => (
          <div key={dispute.id} className="rounded-lg border border-border p-3">
            <p className="text-sm">{dispute.reason}</p>
            {dispute.photos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {dispute.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-14 w-14 rounded-lg border border-border object-cover" />
                  </a>
                ))}
              </div>
            )}
            {dispute.status === "RESOLVED" ? (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">Your response</p>
                <p className="mt-1 text-sm">{dispute.providerResponse}</p>
                {dispute.providerPhotos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dispute.providerPhotos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-14 w-14 rounded-lg border border-border object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Waiting on your response</p>
            )}
          </div>
        ))}
      </div>

      {open && (
        <form onSubmit={resolve} className="mt-4 space-y-3 border-t border-border pt-4">
          <div>
            <label className="text-sm font-medium">Your response</label>
            <p className="text-xs text-muted-foreground">
              Explain what you've done (or will do) about it. Add photos if you've been back to fix anything. Marking this resolved sends it back to the customer to reconfirm.
            </p>
            <Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={3} className="mt-1" />
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
              <p className="text-sm text-muted-foreground">Drag and drop photos of any further work, or click to browse</p>
            )}
            <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
              {uploading ? "Uploading…" : "Add photos"}
            </Button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading || response.trim().length < 5}>
            {loading ? "Sending…" : "Mark resolved"}
          </Button>
        </form>
      )}
    </Card>
  );
}
