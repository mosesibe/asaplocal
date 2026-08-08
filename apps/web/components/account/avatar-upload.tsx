"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { Avatar } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";

export function AvatarUpload({ name, avatarUrl, size = 56 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const router = useRouter();
  const [src, setSrc] = useState(avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(file, "user-avatar");
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: url }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Couldn't save your photo");
      setSrc(url);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      <Avatar src={src} name={name} size={size} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Change photo"
        className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
      >
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
      </button>
      {error && <p className="absolute left-1/2 top-full mt-1 w-40 -translate-x-1/2 text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
