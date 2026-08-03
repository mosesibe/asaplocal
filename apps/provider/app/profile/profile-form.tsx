"use client";
import { useRef, useState } from "react";
import { Button, Card, Input, Textarea } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";

type DayHours = { open: string; close: string } | null;
type WorkingHours = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", DayHours>;

const DAYS: { key: keyof WorkingHours; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

interface BusinessProfile {
  description: string;
  logoUrl: string;
  coverImageUrl: string;
  phone: string;
  website: string;
  baseRadiusMiles: number;
  photoUrls: string[];
  languagesSpoken: string[];
  emergencyCalloutsAvailable: boolean;
  workingHours: WorkingHours | null;
  targetResponseMins?: number;
}

export function ProfileForm({ business }: { business: BusinessProfile }) {
  const [form, setForm] = useState({
    ...business,
    workingHours: business.workingHours ?? ({ mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null } as WorkingHours),
    languagesInput: business.languagesSpoken.join(", "),
    targetResponseMins: business.targetResponseMins ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadFile(file, "business-logo");
      setForm((f) => ({ ...f, logoUrl: url }));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadFile(file, "business-cover");
      setForm((f) => ({ ...f, coverImageUrl: url }));
    } finally {
      setUploadingCover(false);
    }
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadFile(file, "business-photo");
      setForm((f) => ({ ...f, photoUrls: [...f.photoUrls, url] }));
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removePhoto(url: string) {
    setForm((f) => ({ ...f, photoUrls: f.photoUrls.filter((p) => p !== url) }));
  }

  function setDay(key: keyof WorkingHours, hours: DayHours) {
    setForm((f) => ({ ...f, workingHours: { ...f.workingHours, [key]: hours } }));
  }

  async function save() {
    setLoading(true);
    setSaved(false);
    await fetch("/api/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description,
        logoUrl: form.logoUrl || undefined,
        coverImageUrl: form.coverImageUrl || undefined,
        phone: form.phone,
        website: form.website || undefined,
        baseRadiusMiles: form.baseRadiusMiles,
        photoUrls: form.photoUrls,
        languagesSpoken: form.languagesInput.split(",").map((s) => s.trim()).filter(Boolean),
        emergencyCalloutsAvailable: form.emergencyCalloutsAvailable,
        workingHours: form.workingHours,
        targetResponseMins: form.targetResponseMins ? Number(form.targetResponseMins) : undefined,
      }),
    });
    setLoading(false);
    setSaved(true);
  }

  return (
    <Card className="max-w-xl space-y-4 p-6">
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Logo</label>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onPickLogo} />
          <div className="mt-1 flex items-center gap-2">
            {form.logoUrl && <img src={form.logoUrl} alt="Logo" className="h-10 w-10 rounded-full object-cover" />}
            <Button type="button" size="sm" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
              {uploadingLogo ? "Uploading…" : form.logoUrl ? "Replace" : "Upload"}
            </Button>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Cover image</label>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={onPickCover} />
          <div className="mt-1 flex items-center gap-2">
            {form.coverImageUrl && <img src={form.coverImageUrl} alt="Cover" className="h-10 w-16 rounded object-cover" />}
            <Button type="button" size="sm" variant="outline" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}>
              {uploadingCover ? "Uploading…" : form.coverImageUrl ? "Replace" : "Upload"}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Business photos</label>
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
        <div className="mt-2 flex flex-wrap gap-2">
          {form.photoUrls.map((url) => (
            <div key={url} className="relative">
              <img src={url} alt="Business" className="h-16 w-16 rounded-lg object-cover" />
              <button type="button" onClick={() => removePhoto(url)} className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs text-white">×</button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
            {uploadingPhoto ? "Uploading…" : "Add photo"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Phone</label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Website</label>
          <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="mt-1" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Service radius: {form.baseRadiusMiles} miles</label>
        <input type="range" min={1} max={50} value={form.baseRadiusMiles} onChange={(e) => setForm({ ...form, baseRadiusMiles: Number(e.target.value) })} className="w-full" />
      </div>

      <div>
        <label className="text-sm font-medium">Languages spoken (comma-separated)</label>
        <Input value={form.languagesInput} onChange={(e) => setForm({ ...form, languagesInput: e.target.value })} placeholder="English, Polish, Urdu" className="mt-1" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.emergencyCalloutsAvailable} onChange={(e) => setForm({ ...form, emergencyCalloutsAvailable: e.target.checked })} />
        Available for emergency callouts
      </label>

      <div>
        <label className="text-sm font-medium">Target response time (minutes)</label>
        <Input type="number" min={1} value={form.targetResponseMins} onChange={(e) => setForm({ ...form, targetResponseMins: e.target.value as any })} className="mt-1" />
      </div>

      <div>
        <label className="text-sm font-medium">Working hours</label>
        <div className="mt-2 space-y-1.5">
          {DAYS.map(({ key, label }) => {
            const hours = form.workingHours[key];
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                <label className="flex w-24 items-center gap-1.5">
                  <input type="checkbox" checked={hours !== null} onChange={(e) => setDay(key, e.target.checked ? { open: "09:00", close: "17:00" } : null)} />
                  {label}
                </label>
                {hours && (
                  <>
                    <input type="time" value={hours.open} onChange={(e) => setDay(key, { ...hours, open: e.target.value })} className="rounded border border-border bg-background px-2 py-1" />
                    <span>–</span>
                    <input type="time" value={hours.close} onChange={(e) => setDay(key, { ...hours, close: e.target.value })} className="rounded border border-border bg-background px-2 py-1" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {saved && <p className="text-sm text-emerald-700">Saved.</p>}
      <Button onClick={save} disabled={loading}>{loading ? "Saving…" : "Save changes"}</Button>
    </Card>
  );
}
