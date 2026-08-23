"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { Button, Card, Input, Select, Textarea } from "@asaplocal/ui";
import { LocationPicker, type LocationValue } from "./location-picker";
import { PreferredDatePicker, toPreferredDateTime, type PreferredDateValue } from "./preferred-date-picker";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

type Step = "describe" | "confirm";

export function AiJobRequest({
  categories,
  prefillDescription,
}: {
  categories: Category[];
  /** Set by AI Buddy's handoff — bump `nonce` (not just `text`) to retrigger even with identical text. */
  prefillDescription?: { text: string; nonce: number };
}) {
  const parentCategories = categories.filter((c) => !c.parentId);
  const childrenByParent = new Map<string, Category[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    childrenByParent.set(c.parentId, [...(childrenByParent.get(c.parentId) ?? []), c]);
  }
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [step, setStep] = useState<Step>("describe");
  const [description, setDescription] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState("");
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [preferredDate, setPreferredDate] = useState<PreferredDateValue | null>(null);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDescription(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
    }
  }

  function handleDescriptionKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSuggest();
    }
  }

  async function handleSuggest(overrideDescription?: string) {
    const desc = overrideDescription ?? description;
    if (desc.trim().length < 10) {
      setSuggestError("Tell us a bit more so we can find the right pro.");
      return;
    }
    setSuggesting(true);
    setSuggestError(null);
    try {
      const res = await fetch("/api/jobs/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Something went wrong — please try again.");
      setCategoryId(data.categoryId ?? "");
      setTitle(data.title ?? "");
      setConfirmDescription(data.description ?? desc);
      setStep("confirm");
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSuggesting(false);
    }
  }

  // Handoff from AI Buddy: prefill the description and jump straight to the
  // suggest call, same as if the user typed it and hit send.
  useEffect(() => {
    if (!prefillDescription) return;
    setDescription(prefillDescription.text);
    handleSuggest(prefillDescription.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillDescription?.nonce]);

  async function handlePost() {
    setPostError(null);
    setNeedsLogin(false);
    if (!categoryId) {
      setPostError("Please choose a category.");
      return;
    }
    if (!location) {
      setPostError("Please choose a service location so local pros can find you.");
      return;
    }
    setPosting(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          title,
          description: confirmDescription,
          addressLine: location.addressLine,
          city: location.city,
          postcode: location.postcode,
          lat: location.lat,
          lng: location.lng,
          locationSource: location.source,
          preferredDate: preferredDate ? toPreferredDateTime(preferredDate) : undefined,
          flexibleDate: preferredDate ? preferredDate.time === null : true,
          budgetMinPence: budgetMin ? Math.round(Number(budgetMin) * 100) : undefined,
          budgetMaxPence: budgetMax ? Math.round(Number(budgetMax) * 100) : undefined,
        }),
      });
      if (res.status === 401) {
        setNeedsLogin(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Something went wrong — please try again.");
      router.push(`/jobs/${data.id}`);
    } catch (e) {
      setPostError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPosting(false);
    }
  }

  return (
    <Card
      className={`mx-auto max-w-2xl text-left shadow-xl ${step === "describe" ? "p-1.5 sm:p-2" : "p-5 sm:p-6"}`}
    >
      {step === "describe" ? (
        <>
          <div className="mb-1 mt-2 flex items-center gap-1.5 px-3 text-sm font-medium text-brand-600">
            <Sparkles size={16} />
            AI job assistant
          </div>
          <div className="relative rounded-2xl border border-border bg-muted transition-shadow focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
            <textarea
              ref={textareaRef}
              value={description}
              onChange={handleDescriptionChange}
              onKeyDown={handleDescriptionKeyDown}
              rows={3}
              placeholder={'Describe the work you need done — e.g. "My kitchen tap has been leaking for two days and I need it fixed this week"'}
              className="max-h-60 w-full resize-none rounded-2xl bg-transparent px-4 pb-14 pt-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <Button
              size="icon"
              className="absolute bottom-2.5 right-2.5 h-9 w-9 rounded-full"
              onClick={() => handleSuggest()}
              disabled={suggesting || description.trim().length === 0}
              aria-label="Find my pro"
            >
              {suggesting ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}
            </Button>
          </div>
          {suggestError && <p className="mt-2 px-3 text-sm text-red-600 dark:text-red-400">{suggestError}</p>}
          <p className="mb-2 mt-2 px-3 text-xs text-muted-foreground">Press Enter to get matched, Shift+Enter for a new line.</p>
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-brand-600">
              <Sparkles size={16} />
              Confirm your job
            </div>
            <button type="button" className="text-sm text-muted-foreground hover:text-foreground hover:underline" onClick={() => setStep("describe")}>
              Start over
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Category</label>
              <Select
                className="mt-1 border-border bg-surface text-foreground"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Select a category</option>
                {parentCategories.map((p) => (
                  <optgroup key={p.id} label={p.name}>
                    <option value={p.id}>{p.name}</option>
                    {(childrenByParent.get(p.id) ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Job title</label>
              <Input
                className="mt-1 border-border bg-surface text-foreground placeholder:text-muted-foreground"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                className="mt-1 border-border bg-surface text-foreground placeholder:text-muted-foreground"
                rows={4}
                value={confirmDescription}
                onChange={(e) => setConfirmDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Service location</label>
              <div className="mt-1">
                <LocationPicker value={location} onChange={setLocation} tone="light" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">When do you need it done? (optional)</label>
              <div className="mt-1">
                <PreferredDatePicker value={preferredDate} onChange={setPreferredDate} location={location} tone="light" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">Budget min (£, optional)</label>
                <Input
                  type="number"
                  className="mt-1 border-border bg-surface text-foreground placeholder:text-muted-foreground"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Budget max (£, optional)</label>
                <Input
                  type="number"
                  className="mt-1 border-border bg-surface text-foreground placeholder:text-muted-foreground"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                />
              </div>
            </div>
          </div>

          {needsLogin && (
            <p className="mt-3 text-sm text-muted-foreground">
              Please{" "}
              <Link href="/login?callbackUrl=/" className="font-medium text-brand-600 hover:underline">
                log in
              </Link>{" "}
              (or{" "}
              <Link href="/register" className="font-medium text-brand-600 hover:underline">
                sign up
              </Link>
              ) to post this job — your details above are kept.
            </p>
          )}
          {postError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{postError}</p>}

          <Button size="lg" className="w-full" onClick={handlePost} disabled={posting || !location}>
            {posting ? "Posting…" : "Post job & get quotes"}
          </Button>
        </>
      )}
    </Card>
  );
}
