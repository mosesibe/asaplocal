"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Camera, Info, Loader2, Sparkles, X } from "lucide-react";
import { Button, Card, Textarea } from "@asaplocal/ui";
import { uploadFile } from "@/lib/upload";
import { AiJobRequest, type StudioPrefill } from "./ai-job-request";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  slug: string;
}

interface StyleProposal {
  key: string;
  label: string;
  blurb: string;
  scope: string[];
  costMinPence: number;
  costMaxPence: number;
  durationDays: number;
}

interface Concept extends StyleProposal {
  url: string | null;
}

type Step = "upload" | "concepts" | "post";

const MAX_PHOTOS = 5;

function money(pence: number): string {
  return `£${Math.round(pence / 100).toLocaleString("en-GB")}`;
}

function duration(days: number): string {
  if (days <= 1) return "about a day";
  if (days < 10) return `${days} days`;
  const weeks = Math.round(days / 5);
  return `${weeks} week${weeks === 1 ? "" : "s"}`;
}

export function RedesignStudio({ categories }: { categories: Category[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [photos, setPhotos] = useState<string[]>([]);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState<null | "analysing" | "rendering">(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [spaceLabel, setSpaceLabel] = useState<string>("");
  const [needsSpecialist, setNeedsSpecialist] = useState(false);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [prefill, setPrefill] = useState<StudioPrefill | null>(null);

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return;

    setUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(files.slice(0, room).map((f) => uploadFile(f, "job-photo")));
      setPhotos((prev) => [...prev, ...uploaded]);
      setHeroUrl((prev) => prev ?? uploaded[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(url: string) {
    setPhotos((prev) => {
      const next = prev.filter((p) => p !== url);
      if (heroUrl === url) setHeroUrl(next[0] ?? null);
      return next;
    });
  }

  async function handleGenerate() {
    if (!heroUrl) return;
    setError(null);
    setBusy("analysing");
    try {
      const res = await fetch("/api/studio/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePhotos: photos, heroPhotoUrl: heroUrl, briefText: brief.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Something went wrong");

      setSessionId(data.id);
      setSpaceLabel(String(data.spaceType ?? "").replace(/_/g, " ").toLowerCase());
      setNeedsSpecialist(!!data.needsSpecialist);
      setRemaining(typeof data.remainingThisMonth === "number" ? data.remainingThisMonth : null);
      // Show the directions and their estimates straight away; the renders
      // fill in underneath as they finish.
      setConcepts((data.styles as StyleProposal[]).map((s) => ({ ...s, url: null })));
      setStep("concepts");

      setBusy("rendering");
      const genRes = await fetch(`/api/studio/sessions/${data.id}/generate`, { method: "POST" });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.message ?? "We couldn't create the designs");
      setConcepts(genData.concepts as Concept[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function handleChoose(index: number) {
    const chosen = concepts[index];
    if (!chosen?.url || !sessionId) return;
    setError(null);
    try {
      const res = await fetch(`/api/studio/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedIndex: index }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Something went wrong");

      const slug = categorySlugFor(spaceLabel, needsSpecialist);
      const category = categories.find((c) => c.slug === slug) ?? categories.find((c) => c.slug === "builders");

      setPrefill({
        nonce: Date.now(),
        title: `${chosen.label} — ${spaceLabel || "space"} redesign`,
        description: [
          `I'd like to redesign my ${spaceLabel || "space"}.`,
          brief.trim() ? `\nWhat I'm after: ${brief.trim()}` : "",
          `\nStyle: ${chosen.label} — ${chosen.blurb}`,
          chosen.scope.length ? `\nWork involved:\n${chosen.scope.map((s) => `• ${s}`).join("\n")}` : "",
          `\nI've attached photos of the space as it is now, plus an AI concept image showing the look I'm going for. The concept is for inspiration — I'm expecting you to advise on what's actually achievable.`,
        ]
          .filter(Boolean)
          .join("\n"),
        categoryId: category?.id ?? "",
        photos,
        designRenderUrl: chosen.url,
        designSessionId: sessionId,
        budgetMinPence: chosen.costMinPence,
        budgetMaxPence: chosen.costMaxPence,
      });
      setStep("post");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (step === "post" && prefill) {
    return (
      <div className="space-y-4">
        <ConceptNotAQuote />
        <AiJobRequest categories={categories} studioPrefill={prefill} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {step === "upload" && (
        <Card className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="font-semibold">Photograph the space</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add up to {MAX_PHOTOS} photos. Then pick the one angle you want to see redesigned — we&apos;ll
              redesign that view and send the rest to your pro as reference.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFilesSelected}
          />

          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((url) => {
                const isHero = url === heroUrl;
                return (
                  <div key={url} className="relative">
                    <button
                      type="button"
                      onClick={() => setHeroUrl(url)}
                      aria-pressed={isHero}
                      className={`relative block aspect-[4/3] w-full overflow-hidden rounded-xl border-2 transition-colors ${
                        isHero ? "border-brand-600" : "border-transparent hover:border-border"
                      }`}
                    >
                      <Image src={url} alt="" fill sizes="200px" className="object-cover" unoptimized />
                      {isHero && (
                        <span className="absolute bottom-1 left-1 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-medium text-white">
                          Redesigning this
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      aria-label="Remove photo"
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {photos.length < MAX_PHOTOS && (
            <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Camera size={16} className="mr-2" />}
              {uploading ? "Uploading…" : photos.length === 0 ? "Add photos" : "Add another"}
            </Button>
          )}

          <div>
            <label htmlFor="studio-brief" className="text-sm font-medium">
              Anything specific in mind? <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="studio-brief"
              rows={2}
              className="mt-1"
              placeholder="e.g. more storage, somewhere to work from home, brighter and easier to clean"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              maxLength={500}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button size="lg" className="w-full" onClick={handleGenerate} disabled={!heroUrl || !!busy || uploading}>
            {busy ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Sparkles size={18} className="mr-2" />}
            {busy === "analysing" ? "Looking at your space…" : busy === "rendering" ? "Creating designs…" : "Create designs"}
          </Button>
        </Card>
      )}

      {step === "concepts" && (
        <>
          <ConceptNotAQuote />

          {busy === "rendering" && (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Creating your designs — this takes about 20 seconds.
            </p>
          )}
          {error && <p className="text-center text-sm text-red-600">{error}</p>}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {concepts.map((concept, i) => (
              <Card key={concept.key} className="flex flex-col overflow-hidden p-0">
                <div className="relative aspect-[4/3] w-full bg-muted">
                  {concept.url ? (
                    <Image src={concept.url} alt={concept.label} fill sizes="(max-width:640px) 100vw, 33vw" className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      {busy === "rendering" ? <Loader2 size={20} className="animate-spin" /> : <span className="text-xs">Couldn&apos;t create this one</span>}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div>
                    <h3 className="font-semibold">{concept.label}</h3>
                    <p className="text-sm text-muted-foreground">{concept.blurb}</p>
                  </div>

                  <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <div>
                      <dt className="sr-only">Typical cost</dt>
                      <dd className="font-medium">
                        {money(concept.costMinPence)}–{money(concept.costMaxPence)}
                      </dd>
                    </div>
                    <div className="text-muted-foreground">
                      <dt className="sr-only">Typical duration</dt>
                      <dd>{duration(concept.durationDays)}</dd>
                    </div>
                  </dl>

                  {concept.scope.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                      {concept.scope.slice(0, 4).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  )}

                  <Button className="mt-auto w-full" disabled={!concept.url} onClick={() => handleChoose(i)}>
                    Get quotes for this
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <button type="button" className="hover:text-foreground hover:underline" onClick={() => setStep("upload")}>
              ← Start over
            </button>
            {remaining !== null && <span>{remaining} free design{remaining === 1 ? "" : "s"} left this month</span>}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Shown on every screen from the moment concepts exist. A photoreal render
 * reads as a promise, and renovation budgets are large enough that an
 * un-caveated one turns into a dispute — this is the cheapest insurance we have.
 */
function ConceptNotAQuote() {
  return (
    <div className="flex gap-2 rounded-xl border border-border bg-surface p-3 text-sm text-muted-foreground">
      <Info size={16} className="mt-0.5 shrink-0" />
      <p>
        These are <strong className="font-medium text-foreground">concepts, not quotes</strong>. Prices are
        typical ranges for work like this — your pro will confirm what&apos;s achievable in your space after a
        visit.{" "}
        <Link href="/search" className="font-medium text-brand-600 hover:underline">
          Browse pros
        </Link>
      </p>
    </div>
  );
}

/** Mirrors categorySlugForSpace() in core, for the client-side handoff. */
function categorySlugFor(spaceLabel: string, needsSpecialist: boolean): string {
  const map: Record<string, string> = {
    kitchen: "kitchen-fitting",
    bathroom: "bathroom-fitting",
    loft: "loft-conversion",
    garage: "garage-conversion",
    basement: "builders",
    garden: "garden-design-landscaping",
    "outdoor other": "garden-design-landscaping",
    bedroom: "interior-painting",
    "living room": "interior-painting",
    "dining room": "interior-painting",
    hallway: "interior-painting",
    "home office": "interior-painting",
    commercial: "builders",
  };
  const slug = map[spaceLabel] ?? "builders";
  if (needsSpecialist && slug === "interior-painting") return "builders";
  return slug;
}
