"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { Button, Card, Input, Select, Textarea } from "@asaplocal/ui";
import { InstallAppBanner } from "./install-app-banner";
import { LocationPicker, type LocationValue } from "./location-picker";

interface Category {
  id: string;
  name: string;
}

type Step = "describe" | "confirm";

export function AiJobRequest({ categories }: { categories: Category[] }) {
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

  async function handleSuggest() {
    if (description.trim().length < 10) {
      setSuggestError("Tell us a bit more so we can find the right pro.");
      return;
    }
    setSuggesting(true);
    setSuggestError(null);
    try {
      const res = await fetch("/api/jobs/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Something went wrong — please try again.");
      setCategoryId(data.categoryId ?? "");
      setTitle(data.title ?? "");
      setConfirmDescription(data.description ?? description);
      setStep("confirm");
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSuggesting(false);
    }
  }

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
      className={`mx-auto max-w-2xl border-transparent bg-white text-left shadow-xl ${step === "describe" ? "p-1.5 sm:p-2" : "p-5 sm:p-6"}`}
    >
      {step === "describe" ? (
        <>
          <div className="mb-1 mt-2 flex items-center gap-1.5 px-3 text-sm font-medium text-brand-600">
            <Sparkles size={16} />
            AI job assistant
          </div>
          <div className="relative rounded-2xl border border-espresso-100 bg-espresso-50 transition-shadow focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
            <textarea
              ref={textareaRef}
              value={description}
              onChange={handleDescriptionChange}
              onKeyDown={handleDescriptionKeyDown}
              rows={3}
              placeholder={'Describe the work you need done — e.g. "My kitchen tap has been leaking for two days and I need it fixed this week"'}
              className="max-h-60 w-full resize-none rounded-2xl bg-transparent px-4 pb-14 pt-3.5 text-base text-espresso-900 placeholder:text-espresso-400 focus:outline-none"
            />
            <Button
              size="icon"
              className="absolute bottom-2.5 right-2.5 h-9 w-9 rounded-full"
              onClick={handleSuggest}
              disabled={suggesting || description.trim().length === 0}
              aria-label="Find my pro"
            >
              {suggesting ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}
            </Button>
          </div>
          {suggestError && <p className="mt-2 px-3 text-sm text-red-600">{suggestError}</p>}
          <p className="mb-2 mt-2 px-3 text-xs text-espresso-400">Press Enter to get matched, Shift+Enter for a new line.</p>
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-brand-600">
              <Sparkles size={16} />
              Confirm your job
            </div>
            <button type="button" className="text-sm text-espresso-400 hover:text-espresso-600 hover:underline" onClick={() => setStep("describe")}>
              Start over
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-espresso-900">Category</label>
              <Select
                className="mt-1 border-espresso-200 bg-white text-espresso-900"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-espresso-900">Job title</label>
              <Input
                className="mt-1 border-espresso-200 bg-white text-espresso-900 placeholder:text-espresso-400"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-espresso-900">Description</label>
              <Textarea
                className="mt-1 border-espresso-200 bg-white text-espresso-900 placeholder:text-espresso-400"
                rows={4}
                value={confirmDescription}
                onChange={(e) => setConfirmDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-espresso-900">Service location</label>
              <div className="mt-1">
                <LocationPicker value={location} onChange={setLocation} tone="light" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-espresso-900">Budget min (£, optional)</label>
                <Input
                  type="number"
                  className="mt-1 border-espresso-200 bg-white text-espresso-900 placeholder:text-espresso-400"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-espresso-900">Budget max (£, optional)</label>
                <Input
                  type="number"
                  className="mt-1 border-espresso-200 bg-white text-espresso-900 placeholder:text-espresso-400"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                />
              </div>
            </div>
          </div>

          {needsLogin && (
            <p className="mt-3 text-sm text-espresso-400">
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
          {postError && <p className="mt-3 text-sm text-red-600">{postError}</p>}

          <div className="mt-4">
            <InstallAppBanner />
          </div>

          <Button size="lg" className="w-full" onClick={handlePost} disabled={posting || !location}>
            {posting ? "Posting…" : "Post job & get quotes"}
          </Button>
        </>
      )}
    </Card>
  );
}
