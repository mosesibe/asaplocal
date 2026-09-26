"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Button, Card, Input } from "@asaplocal/ui";
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

  const [names, setNames] = useState({ firstName, lastName });
  const [draft, setDraft] = useState({ firstName, lastName });
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const name = `${names.firstName} ${names.lastName}`.trim();

  /** The endpoint validates the whole profile, so every save sends all three fields. */
  async function saveProfile(next: { firstName: string; lastName: string; avatarUrl: string | null }) {
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...next, avatarUrl: next.avatarUrl || undefined }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message ?? "Couldn't save your changes");
    }
  }

  async function onSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setError(null);
    try {
      await saveProfile({ ...draft, avatarUrl: avatar });
      setNames(draft);
      setEditingName(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your changes");
    } finally {
      setSavingName(false);
    }
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(file, "user-avatar");
      await saveProfile({ ...names, avatarUrl: url });
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

      <div className="p-4">
        {editingName ? (
          <form onSubmit={onSaveName} className="space-y-2">
            <p className="text-xs text-muted-foreground">Name</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                required
                aria-label="First name"
                placeholder="First name"
                value={draft.firstName}
                onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
              />
              <Input
                required
                aria-label="Last name"
                placeholder="Last name"
                value={draft.lastName}
                onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={savingName || !draft.firstName.trim() || !draft.lastName.trim()}>
                {savingName ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={savingName}
                onClick={() => {
                  setDraft(names);
                  setEditingName(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">{name || "—"}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setDraft(names);
                setEditingName(true);
              }}
            >
              Edit
            </Button>
          </div>
        )}
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
