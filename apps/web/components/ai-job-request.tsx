"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button, Card, Input, Select, Textarea } from "@asaplocal/ui";
import { InstallAppBanner } from "./install-app-banner";

interface Category {
  id: string;
  name: string;
}

type Step = "describe" | "confirm";

export function AiJobRequest({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("describe");
  const [description, setDescription] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState("");
  const [city, setCity] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

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
    if (city.trim().length < 2) {
      setPostError("Please add your city so local pros can find you.");
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
          city,
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
    <Card className="mx-auto max-w-2xl p-5 text-left sm:p-6">
      {step === "describe" ? (
        <>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-brand-700">
            <Sparkles size={16} />
            AI job assistant
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder={'Describe the work you need done — e.g. "My kitchen tap has been leaking for two days and I need it fixed this week"'}
            className="text-base"
          />
          {suggestError && <p className="mt-2 text-sm text-red-600">{suggestError}</p>}
          <Button size="lg" className="mt-4 w-full" onClick={handleSuggest} disabled={suggesting}>
            {suggesting ? "Thinking…" : "Find my pro"}
          </Button>
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-brand-700">
              <Sparkles size={16} />
              Confirm your job
            </div>
            <button type="button" className="text-sm text-muted-foreground hover:underline" onClick={() => setStep("describe")}>
              Start over
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select className="mt-1" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Job title</label>
              <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea className="mt-1" rows={4} value={confirmDescription} onChange={(e) => setConfirmDescription(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">City</label>
              <Input className="mt-1" placeholder="e.g. Manchester" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Budget min (£, optional)</label>
                <Input type="number" className="mt-1" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Budget max (£, optional)</label>
                <Input type="number" className="mt-1" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
              </div>
            </div>
          </div>

          {needsLogin && (
            <p className="mt-3 text-sm text-muted-foreground">
              Please{" "}
              <Link href="/login?callbackUrl=/" className="font-medium text-brand-700 hover:underline">
                log in
              </Link>{" "}
              (or{" "}
              <Link href="/register" className="font-medium text-brand-700 hover:underline">
                sign up
              </Link>
              ) to post this job — your details above are kept.
            </p>
          )}
          {postError && <p className="mt-3 text-sm text-red-600">{postError}</p>}

          <div className="mt-4">
            <InstallAppBanner />
          </div>

          <Button size="lg" className="w-full" onClick={handlePost} disabled={posting}>
            {posting ? "Posting…" : "Post job & get quotes"}
          </Button>
        </>
      )}
    </Card>
  );
}
