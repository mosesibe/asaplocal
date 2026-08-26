"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@asaplocal/ui";
import { AiJobRequest } from "./ai-job-request";
import { AiBuddy } from "./ai-buddy";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

type Mode = "job" | "buddy" | "studio";

const COPY: Record<Mode, { title: string; subtitle: string }> = {
  job: { title: "What do you need done?", subtitle: "Describe the job in your own words — we'll match you with vetted local pros ASAP." },
  buddy: { title: "Not sure where to start?", subtitle: "Ask AI Buddy first — it's free, and it'll tell you if this is a DIY job or one for a pro." },
  studio: { title: "See what your space could be", subtitle: "Photograph a room, loft or garden and get redesign ideas — with realistic costs and timescales." },
};

const MODES: { key: Mode; label: string }[] = [
  { key: "job", label: "Post a job" },
  { key: "buddy", label: "Ask AI Buddy" },
  { key: "studio", label: "Redesign a space" },
];

export function HomepageAiSection({ categories }: { categories: Category[] }) {
  const [mode, setMode] = useState<Mode>("job");
  const [handoff, setHandoff] = useState<{ text: string; nonce: number } | null>(null);

  function handleHandoff(summary: string) {
    setHandoff({ text: summary, nonce: Date.now() });
    setMode("job");
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-background px-4 py-14 sm:px-6 sm:py-20 dark:from-espresso-950 dark:to-espresso-950">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-100/60 via-transparent to-transparent dark:from-brand-900/40"
        aria-hidden
      />
      <div className="relative mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{COPY[mode].title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{COPY[mode].subtitle}</p>
      </div>

      <div className="relative mx-auto mt-6 flex max-w-2xl justify-center">
        <div className="inline-flex flex-wrap justify-center rounded-full border border-border bg-surface/80 p-1 shadow-sm">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === m.key ? "bg-brand-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mx-auto mt-6 max-w-2xl">
        {mode === "job" && <AiJobRequest categories={categories} prefillDescription={handoff ?? undefined} />}
        {mode === "buddy" && <AiBuddy onHandoff={handleHandoff} />}
        {/* The studio is a multi-step, photo-heavy flow that needs an account,
            so the homepage sells it and /studio hosts it. */}
        {mode === "studio" && <StudioTeaser />}
      </div>

      {mode === "job" && (
        <p className="relative mt-4 text-center text-sm text-muted-foreground">
          Prefer to look yourself? <Link href="/search" className="font-medium text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-300 dark:hover:text-brand-200">Browse providers directly</Link>
        </p>
      )}
    </section>
  );
}

function StudioTeaser() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-transparent bg-white p-6 text-center shadow-xl dark:bg-espresso-900">
      <Sparkles size={22} className="mx-auto text-brand-600" />
      <p className="mt-3 text-espresso-900 dark:text-espresso-50">
        Take a photo of the space you want to change. We&apos;ll show you a few ways it could look, what the
        work typically costs, and how long it takes — then connect you with insured local pros.
      </p>
      <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-espresso-400">
        <li>Kitchens</li>
        <li>Lofts</li>
        <li>Bathrooms</li>
        <li>Gardens</li>
        <li>Home offices</li>
      </ul>
      <Link href="/studio" className="mt-5 inline-block">
        <Button size="lg">Redesign a space — free</Button>
      </Link>
      <p className="mt-2 text-xs text-espresso-400">3 free designs a month</p>
    </div>
  );
}
