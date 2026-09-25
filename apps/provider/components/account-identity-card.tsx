"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Button, Card } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";

// The account page's identity block, shared in shape with the mobile app's
// account screen (apps/mobile-provider/src/app/(tabs)/account.tsx) so the
// same details appear in the same order on every platform.
export function AccountIdentityCard({
  firstName,
  lastName,
  avatarUrl,
  email,
  emailVerified,
  phone,
  phoneVerified,
  memberSince,
}: {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  memberSince: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = `${firstName} ${lastName}`.trim();

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(file, "user-avatar");
      // The profile endpoint validates the whole object, so the existing
      // names go back with it — this only ever changes the photo.
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, avatarUrl: url }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.message ?? "Couldn't save your photo");
        return;
      }
      setAvatar(url);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="mt-6 max-w-lg divide-y divide-border p-0">
      <div className="flex items-center gap-4 p-4">
        <Avatar src={avatar} name={name || email} size={56} />
        <div>
          <p className="text-xs text-muted-foreground">Photo</p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : avatar ? "Replace" : "Upload"}
          </Button>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">Name</p>
          <p className="font-medium">{name || "—"}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="truncate font-medium">{email}</p>
        </div>
        <Badge variant={emailVerified ? "success" : "warning"}>{emailVerified ? "Verified" : "Unverified"}</Badge>
      </div>

      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="font-medium">{phone ?? "—"}</p>
        </div>
        {phone && <Badge variant={phoneVerified ? "success" : "warning"}>{phoneVerified ? "Verified" : "Unverified"}</Badge>}
      </div>

      <div className="p-4">
        <p className="text-xs text-muted-foreground">Member since</p>
        <p className="font-medium">{memberSince}</p>
      </div>
    </Card>
  );
}
