"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button, Input } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";

interface AccountSettingsPanelProps {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
}

export function AccountSettingsPanel({ firstName, lastName, email, avatarUrl }: AccountSettingsPanelProps) {
  const router = useRouter();
  const [form, setForm] = useState({ firstName, lastName, avatarUrl: avatarUrl ?? "" });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    setError(null);
    try {
      const url = await uploadFile(file, "user-avatar");
      setForm((f) => ({ ...f, avatarUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function save() {
    setLoading(true);
    setSaved(false);
    setError(null);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, avatarUrl: form.avatarUrl || undefined }),
    }).catch(() => null);
    setLoading(false);
    if (!res || !res.ok) {
      const body = await res?.json().catch(() => ({}));
      setError(body?.message ?? "Something went wrong — your changes weren't saved.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Photo</label>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
        <div className="mt-1 flex items-center gap-3">
          <Avatar src={form.avatarUrl || null} name={`${form.firstName} ${form.lastName}`} size={48} />
          <Button type="button" size="sm" variant="outline" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}>
            {uploadingAvatar ? "Uploading…" : form.avatarUrl ? "Replace" : "Upload"}
          </Button>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">First name</label>
        <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="mt-1" />
      </div>
      <div>
        <label className="text-sm font-medium">Last name</label>
        <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="mt-1" />
      </div>
      <div>
        <label className="text-sm font-medium">Email</label>
        <Input value={email} disabled className="mt-1" />
      </div>
      {saved && <p className="text-sm text-emerald-700">Saved.</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={save} disabled={loading}>
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
