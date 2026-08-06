"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button, Card, Input } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";

type ImageField = "profilePhotoUrl" | "idFrontImageUrl" | "idBackImageUrl";

interface Props {
  staffId?: string;
  initial?: {
    fullName: string;
    jobTitle: string | null;
    phone: string;
    email: string | null;
    profilePhotoUrl: string;
    idFrontImageUrl: string;
    idBackImageUrl: string;
  };
}

export function StaffForm({ staffId, initial }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(initial?.profilePhotoUrl ?? "");
  const [idFrontImageUrl, setIdFrontImageUrl] = useState(initial?.idFrontImageUrl ?? "");
  const [idBackImageUrl, setIdBackImageUrl] = useState(initial?.idBackImageUrl ?? "");
  const [uploading, setUploading] = useState<ImageField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingField, setPendingField] = useState<ImageField | null>(null);

  const setters: Record<ImageField, (url: string) => void> = {
    profilePhotoUrl: setProfilePhotoUrl,
    idFrontImageUrl: setIdFrontImageUrl,
    idBackImageUrl: setIdBackImageUrl,
  };
  const values: Record<ImageField, string> = { profilePhotoUrl, idFrontImageUrl, idBackImageUrl };
  const purposes: Record<ImageField, "staff-profile-photo" | "staff-id-front" | "staff-id-back"> = {
    profilePhotoUrl: "staff-profile-photo",
    idFrontImageUrl: "staff-id-front",
    idBackImageUrl: "staff-id-back",
  };

  function triggerUpload(field: ImageField) {
    setPendingField(field);
    fileInputRef.current?.click();
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pendingField) return;
    setUploading(pendingField);
    setError(null);
    try {
      const url = await uploadFile(file, purposes[pendingField]);
      setters[pendingField](url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
      setPendingField(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profilePhotoUrl || !idFrontImageUrl || !idBackImageUrl) {
      setError("Profile photo and both sides of the company ID are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = { fullName, jobTitle: jobTitle || undefined, phone, email: email || undefined, profilePhotoUrl, idFrontImageUrl, idBackImageUrl };
      const res = await fetch(staffId ? `/api/staff/${staffId}` : "/api/staff", {
        method: staffId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Something went wrong");
      router.push("/staff");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const imageFields: { field: ImageField; label: string }[] = [
    { field: "profilePhotoUrl", label: "Profile photo" },
    { field: "idFrontImageUrl", label: "Company ID — front" },
    { field: "idBackImageUrl", label: "Company ID — back" },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
      <Card className="space-y-3 p-6">
        <Input required placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input placeholder="Role / job title (optional)" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        <Input required placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Card>

      <Card className="space-y-3 p-6">
        <p className="text-sm text-muted-foreground">
          This is shown to customers so they know exactly who's attending their job — a clear profile photo and both sides of the staff
          member's company ID are required before an admin can approve them.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {imageFields.map(({ field, label }) => (
            <div key={field} className="space-y-2 text-center">
              {values[field] ? (
                <Avatar src={values[field]} name={label} size={72} className="mx-auto rounded-lg" />
              ) : (
                <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                  None
                </div>
              )}
              <p className="text-xs text-muted-foreground">{label}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => triggerUpload(field)} disabled={uploading === field}>
                {uploading === field ? "Uploading…" : values[field] ? "Replace" : "Upload"}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving…" : staffId ? "Save changes" : "Submit for approval"}
      </Button>
    </form>
  );
}
