"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Card, Input, Textarea, formatPence } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";

interface Variation {
  id: string;
  description: string;
  amountPence: number;
  photos: string[];
  status: string;
  createdAt: string | Date;
}

export function VariationPanel({ bookingId, variations }: { bookingId: string; variations: Variation[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
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
    const results = await Promise.allSettled(images.map((f) => uploadFile(f, "job-photo")));
    const urls = results.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled").map((r) => r.value);
    const failures = results.length - urls.length;
    if (urls.length > 0) setPhotos((p) => [...p, ...urls]);
    if (failures > 0) setError(`${failures} photo${failures > 1 ? "s" : ""} failed to upload`);
    setUploading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const pounds = Number(amount);
    if (!description.trim() || !Number.isFinite(pounds) || pounds <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/variations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), amountPence: Math.round(pounds * 100), photos }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Couldn't propose the extra");
      setDescription("");
      setAmount("");
      setPhotos([]);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const pending = variations.filter((v) => v.status === "PENDING");
  const accepted = variations.filter((v) => v.status === "ACCEPTED");

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Extra work</h2>
          <p className="text-sm text-muted-foreground">
            Agreed something beyond the quote? Propose it here — the customer has to approve before it's charged.
          </p>
        </div>
        {!open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus size={15} /> Propose extra
          </Button>
        )}
      </div>

      {variations.length > 0 && (
        <div className="mt-4 space-y-2">
          {variations.map((v) => (
            <div key={v.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm">{v.description}</p>
                <span className="shrink-0 text-sm font-semibold">{formatPence(v.amountPence)}</span>
              </div>
              {v.photos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {v.photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-14 w-14 rounded-lg border border-border object-cover" />
                    </a>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {v.status === "PENDING" ? "Waiting for the customer to approve" : v.status === "ACCEPTED" ? "Approved — will be added to the balance" : "Declined by the customer"}
              </p>
            </div>
          ))}
          {(pending.length > 0 || accepted.length > 0) && (
            <p className="text-xs text-muted-foreground">
              {accepted.length > 0 && `${formatPence(accepted.reduce((s, v) => s + v.amountPence, 0))} approved`}
              {accepted.length > 0 && pending.length > 0 && " · "}
              {pending.length > 0 && `${pending.length} awaiting approval`}
            </p>
          )}
        </div>
      )}

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3 border-t border-border pt-4">
          <div>
            <label className="text-sm font-medium">What's the extra work?</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Rotten joist found under the decking — needs replacing before the boards go back"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Additional cost (£)</label>
            <Input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-40" />
          </div>

          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; await uploadPhotos(f); }} />
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
              <p className="text-sm text-muted-foreground">Drag and drop photos showing why, or click to browse</p>
            )}
            <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
              {uploading ? "Uploading…" : "Add photos"}
            </Button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !description.trim() || !amount}>
              {loading ? "Sending…" : "Send to customer"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
