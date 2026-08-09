"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";

interface Policy {
  type: string;
  provider: string;
  policyNumber: string;
  expiryDate: string;
  coverageAmountPence: number;
  documentUrl: string;
  status: string;
}

const TYPES: { type: string; label: string; required: boolean }[] = [
  { type: "PUBLIC_LIABILITY", label: "Public Liability", required: true },
  { type: "PROFESSIONAL_INDEMNITY", label: "Professional Indemnity", required: false },
  { type: "EMPLOYERS_LIABILITY", label: "Employer's Liability", required: false },
];

function statusVariant(status: string) {
  if (status === "VERIFIED") return "success" as const;
  if (status === "REJECTED") return "destructive" as const;
  return "warning" as const;
}

function PolicyForm({ type, label, required, existing }: { type: string; label: string; required: boolean; existing?: Policy }) {
  const router = useRouter();
  const [provider, setProvider] = useState(existing?.provider ?? "");
  const [policyNumber, setPolicyNumber] = useState(existing?.policyNumber ?? "");
  const [expiryDate, setExpiryDate] = useState(existing?.expiryDate ?? "");
  const [coverageAmount, setCoverageAmount] = useState(existing ? String(existing.coverageAmountPence / 100) : "");
  const [documentUrl, setDocumentUrl] = useState(existing?.documentUrl ?? "");
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
      setDocumentUrl(await uploadFile(file, "insurance-doc"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!documentUrl) {
      setError("Upload your policy document");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/verification/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          provider,
          policyNumber,
          expiryDate,
          coverageAmountPence: Math.round(Number(coverageAmount) * 100),
          documentUrl,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Something went wrong");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="space-y-3 p-6">
      <div className="flex items-center justify-between">
        <p className="font-medium">{label}{required && <span className="text-red-600"> *</span>}</p>
        {existing && <Badge variant={statusVariant(existing.status)}>{existing.status}</Badge>}
      </div>
      <form onSubmit={submit} className="space-y-3">
        <Input required placeholder="Insurance provider" value={provider} onChange={(e) => setProvider(e.target.value)} />
        <Input required placeholder="Policy number" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input required type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          <Input required type="number" min={0} placeholder="Coverage (£)" value={coverageAmount} onChange={(e) => setCoverageAmount(e.target.value)} />
        </div>
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFileSelected} />
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : documentUrl ? "Document uploaded ✓" : "Upload policy PDF"}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Saving…" : existing ? "Update policy" : "Submit policy"}</Button>
      </form>
    </Card>
  );
}

export function InsuranceForm({ policies }: { policies: Policy[] }) {
  const byType = new Map(policies.map((p) => [p.type, p]));
  return (
    <div className="mt-6 space-y-4">
      {TYPES.map((t) => (
        <PolicyForm key={t.type} type={t.type} label={t.label} required={t.required} existing={byType.get(t.type)} />
      ))}
    </div>
  );
}
