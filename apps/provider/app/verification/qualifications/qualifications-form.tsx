"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Select } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";

interface Existing {
  id: string;
  name: string;
  status: string;
  documentUrl: string | null;
}

function statusVariant(status: string) {
  if (status === "VERIFIED") return "success" as const;
  if (status === "REJECTED") return "destructive" as const;
  return "warning" as const;
}

export function QualificationsForm({ categories, existing }: { categories: { id: string; name: string }[]; existing: Existing[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [issuingBody, setIssuingBody] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setDocumentUrl(await uploadFile(file, "qualification-doc"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/verification/qualifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, categoryId: categoryId || undefined, issuingBody: issuingBody || undefined, documentUrl: documentUrl || undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Something went wrong");
      setName("");
      setIssuingBody("");
      setDocumentUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <Card className="space-y-2 p-4">
        {existing.length === 0 && <p className="text-sm text-muted-foreground">No qualifications submitted yet.</p>}
        {existing.map((q) => (
          <div key={q.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-sm font-medium">{q.name}</span>
            <Badge variant={statusVariant(q.status)}>{q.status}</Badge>
          </div>
        ))}
      </Card>

      <Card className="space-y-3 p-6">
        <p className="text-sm font-medium">Add a qualification</p>
        <form onSubmit={submit} className="space-y-3">
          <Input required placeholder="Qualification name (e.g. NICEIC)" value={name} onChange={(e) => setName(e.target.value)} />
          {categories.length > 0 && (
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Not category-specific</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
          <Input placeholder="Issuing body (optional)" value={issuingBody} onChange={(e) => setIssuingBody(e.target.value)} />
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFileSelected} />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : documentUrl ? "Certificate uploaded ✓" : "Upload certificate"}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Adding…" : "Add qualification"}</Button>
        </form>
      </Card>
    </div>
  );
}
