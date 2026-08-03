"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, Textarea } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";

interface Item {
  id: string;
  title: string | null;
  description: string | null;
  beforeUrl: string | null;
  afterUrl: string | null;
  videoUrl: string | null;
  photoUrls: string[];
}

export function PortfolioManager({ categories, items }: { categories: { id: string; name: string }[]; items: Item[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [beforeUrl, setBeforeUrl] = useState("");
  const [afterUrl, setAfterUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  async function pick(kind: "before" | "after" | "video" | "photo", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(kind);
    setError(null);
    try {
      const url = await uploadFile(file, "portfolio-media");
      if (kind === "before") setBeforeUrl(url);
      else if (kind === "after") setAfterUrl(url);
      else if (kind === "video") setVideoUrl(url);
      else setPhotoUrls((p) => [...p, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || undefined, description: description || undefined, categoryId: categoryId || undefined, beforeUrl: beforeUrl || undefined, afterUrl: afterUrl || undefined, videoUrl: videoUrl || undefined, photoUrls }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Something went wrong");
      setTitle(""); setDescription(""); setBeforeUrl(""); setAfterUrl(""); setVideoUrl(""); setPhotoUrls([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    await fetch("/api/portfolio", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-4">
      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between">
                <p className="font-medium">{item.title ?? "Untitled project"}</p>
                <button type="button" onClick={() => remove(item.id)} className="text-sm text-red-600 hover:underline">Remove</button>
              </div>
              {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
              <div className="flex flex-wrap gap-2">
                {item.beforeUrl && <img src={item.beforeUrl} alt="Before" className="h-16 w-16 rounded object-cover" />}
                {item.afterUrl && <img src={item.afterUrl} alt="After" className="h-16 w-16 rounded object-cover" />}
                {item.photoUrls.map((url) => <img key={url} src={url} alt="" className="h-16 w-16 rounded object-cover" />)}
                {item.videoUrl && <video src={item.videoUrl} className="h-16 w-24 rounded object-cover" muted />}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="space-y-3 p-6">
        <p className="font-medium">Add a project</p>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description (optional)" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          {categories.length > 0 && (
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">No specific category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
          <div className="grid grid-cols-2 gap-3">
            <input ref={beforeRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick("before", e)} />
            <Button type="button" variant="outline" size="sm" onClick={() => beforeRef.current?.click()} disabled={uploading === "before"}>
              {uploading === "before" ? "Uploading…" : beforeUrl ? "Before ✓" : "Upload before photo"}
            </Button>
            <input ref={afterRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick("after", e)} />
            <Button type="button" variant="outline" size="sm" onClick={() => afterRef.current?.click()} disabled={uploading === "after"}>
              {uploading === "after" ? "Uploading…" : afterUrl ? "After ✓" : "Upload after photo"}
            </Button>
          </div>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick("photo", e)} />
          <Button type="button" variant="outline" size="sm" onClick={() => photoRef.current?.click()} disabled={uploading === "photo"}>
            {uploading === "photo" ? "Uploading…" : `Add photo (${photoUrls.length})`}
          </Button>
          <input ref={videoRef} type="file" accept="video/mp4" className="hidden" onChange={(e) => pick("video", e)} />
          <Button type="button" variant="outline" size="sm" onClick={() => videoRef.current?.click()} disabled={uploading === "video"}>
            {uploading === "video" ? "Uploading…" : videoUrl ? "Video ✓" : "Upload video (optional)"}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Adding…" : "Add project"}</Button>
        </form>
      </Card>
    </div>
  );
}
