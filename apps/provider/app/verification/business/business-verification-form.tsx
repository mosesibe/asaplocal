"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Badge } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";

const DOC_TYPES = [
  { value: "UTILITY_BILL", label: "Utility bill" },
  { value: "BUSINESS_BANK_STATEMENT", label: "Business bank statement" },
  { value: "HMRC_CORRESPONDENCE", label: "HMRC correspondence" },
  { value: "PUBLIC_LIABILITY_INSURANCE", label: "Public liability insurance" },
] as const;

interface Props {
  businessType: string | null;
  verificationStatus: string;
  companyRegistrationNumber: string | null;
  companyDirectorName: string | null;
  companiesHouseDirectorMatch: boolean | null;
  documents: { id: string; docType: string; fileUrl: string }[];
}

export function BusinessVerificationForm(props: Props) {
  const router = useRouter();
  const [companyNumber, setCompanyNumber] = useState(props.companyRegistrationNumber ?? "");
  const [directorName, setDirectorName] = useState(props.companyDirectorName ?? "");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ isActive: boolean; notDissolved: boolean; directorMatch: boolean; companyStatus: string; verified: boolean } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDocType, setPendingDocType] = useState<string | null>(null);

  async function checkCompany(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/verification/business/companies-house", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyNumber, directorName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Something went wrong");
        return;
      }
      setResult(data);
      router.refresh();
    } finally {
      setChecking(false);
    }
  }

  function triggerUpload(docType: string) {
    setPendingDocType(docType);
    fileInputRef.current?.click();
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pendingDocType) return;
    setUploading(pendingDocType);
    setError(null);
    try {
      const fileUrl = await uploadFile(file, "verification-doc");
      const res = await fetch("/api/verification/business/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType: pendingDocType, fileUrl }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Upload failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
      setPendingDocType(null);
    }
  }

  if (props.businessType === "LIMITED_COMPANY") {
    return (
      <Card className="mt-6 space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          We'll automatically check your company against Companies House — active status, not dissolved, and that the director you name is currently listed.
        </p>
        <form onSubmit={checkCompany} className="space-y-3">
          <Input required placeholder="Company registration number" value={companyNumber} onChange={(e) => setCompanyNumber(e.target.value)} />
          <Input required placeholder="Director's full name" value={directorName} onChange={(e) => setDirectorName(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={checking}>{checking ? "Checking…" : "Verify with Companies House"}</Button>
        </form>
        {result && (
          <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
            <p>Status: {result.companyStatus} {result.isActive ? "✓" : "✗"}</p>
            <p>Not dissolved: {result.notDissolved ? "✓" : "✗"}</p>
            <p>Director match: {result.directorMatch ? "✓" : "✗"}</p>
            <p className="pt-1 font-medium">
              {result.verified ? "Verified automatically." : "Sent for manual review — one or more checks didn't pass automatically."}
            </p>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="mt-6 space-y-4 p-6">
      <p className="text-sm text-muted-foreground">
        Upload one or more documents proving you're trading — an admin will review them manually.
      </p>
      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFileSelected} />
      <div className="space-y-2">
        {DOC_TYPES.map((d) => {
          const uploaded = props.documents.find((doc) => doc.docType === d.value);
          return (
            <div key={d.value} className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm">{d.label}</span>
              {uploaded ? (
                <Badge variant="success">Uploaded</Badge>
              ) : (
                <Button size="sm" variant="outline" onClick={() => triggerUpload(d.value)} disabled={uploading === d.value}>
                  {uploading === d.value ? "Uploading…" : "Upload"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-sm text-muted-foreground">Status: {props.verificationStatus}</p>
    </Card>
  );
}
