"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Textarea } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";

interface Props {
  bookingId: string;
  status: string;
  entryCount: number;
}

export function JobSheetPanel({ bookingId, status, entryCount }: Props) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<"start" | "add" | "finish" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Same drag/drop + presigned-S3 flow as the business profile photo picker
  // (app/profile/profile-form.tsx), against the existing "job-photo" purpose.
  async function uploadPhotos(files: File[]) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;
    setUploadingPhoto(true);
    setError(null);
    const results = await Promise.allSettled(images.map((file) => uploadFile(file, "job-photo")));
    const urls = results.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled").map((r) => r.value);
    const failures = results.length - urls.length;
    if (urls.length > 0) setPhotos((p) => [...p, ...urls]);
    if (failures > 0) setError(`${failures} photo${failures > 1 ? "s" : ""} failed to upload`);
    setUploadingPhoto(false);
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    await uploadPhotos(files);
  }

  function onPhotoDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingPhoto(true);
  }

  function onPhotoDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingPhoto(false);
  }

  async function onPhotoDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingPhoto(false);
    await uploadPhotos(Array.from(e.dataTransfer.files));
  }

  function removePhoto(url: string) {
    setPhotos((p) => p.filter((u) => u !== url));
  }

  async function post(path: string, body?: unknown) {
    const res = await fetch(`/api/bookings/${bookingId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Something went wrong");
  }

  async function onStart() {
    setLoading("start");
    setError(null);
    try {
      await post("start");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function onAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading("add");
    setError(null);
    try {
      await post("job-sheet", { description: description.trim(), photos });
      setDescription("");
      setPhotos([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function onFinish() {
    setLoading("finish");
    setError(null);
    try {
      await post("finish");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  if (status === "CONFIRMED") {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Ready to head out? Start the job to begin logging your work.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <Button className="mt-4" onClick={onStart} disabled={loading !== null}>
          {loading === "start" ? "Starting…" : "Start job"}
        </Button>
      </Card>
    );
  }

  if (status === "IN_PROGRESS") {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Log what you're doing as you go — the customer will see this list.</p>
        <form onSubmit={onAddEntry} className="mt-3">
          <div className="flex gap-2">
            <Textarea
              placeholder="e.g. Replaced the fuse box wiring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-0 flex-1"
              rows={2}
            />
            <Button type="submit" disabled={loading !== null || !description.trim()}>
              {loading === "add" ? "Adding…" : "Add"}
            </Button>
          </div>

          <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickPhoto} />
          <div
            onDragOver={onPhotoDragOver}
            onDragLeave={onPhotoDragLeave}
            onDrop={onPhotoDrop}
            onClick={() => photoInputRef.current?.click()}
            className={`mt-2 flex flex-wrap items-center gap-2 rounded-lg border-2 border-dashed p-3 transition-colors ${
              isDraggingPhoto ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            {photos.map((url) => (
              <div key={url} className="relative" onClick={(e) => e.stopPropagation()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Work done" className="h-16 w-16 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  aria-label="Remove photo"
                  className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length === 0 && !uploadingPhoto && (
              <p className="text-sm text-muted-foreground">Drag and drop photos of the work here, or click to browse</p>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                photoInputRef.current?.click();
              }}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? "Uploading…" : "Add photos"}
            </Button>
          </div>
          {photos.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {photos.length} photo{photos.length > 1 ? "s" : ""} will be attached to this entry.
            </p>
          )}
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-5 border-t border-border pt-4">
          <Button onClick={onFinish} disabled={loading !== null || entryCount === 0}>
            {loading === "finish" ? "Finishing…" : "Finish job"}
          </Button>
          {entryCount === 0 && <p className="mt-2 text-xs text-muted-foreground">Add at least one action before you can finish.</p>}
        </div>
      </Card>
    );
  }

  if (status === "AWAITING_APPROVAL") {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Job marked as done — waiting for the customer to confirm completion.</p>
      </Card>
    );
  }

  if (status === "COMPLETED") {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">The customer has confirmed this job as complete.</p>
      </Card>
    );
  }

  if (status === "PENDING") {
    return (
      <Card className="p-6">
        <p className="text-sm font-medium">Waiting for the customer's deposit</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You'll be notified the moment it clears — you can start the job from here once it does.
        </p>
      </Card>
    );
  }

  // CANCELLED / DISPUTED — no actions, but never leave the page blank.
  return (
    <Card className="p-6">
      <p className="text-sm text-muted-foreground">
        This booking is {status.replace(/_/g, " ").toLowerCase()} — there's nothing to do here.
      </p>
    </Card>
  );
}
