"use client";

import { useState } from "react";
import Link from "next/link";
import { AiJobRequest } from "./ai-job-request";
import { AiBuddy } from "./ai-buddy";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

type Mode = "job" | "buddy";

const COPY: Record<Mode, { title: string; subtitle: string }> = {
  job: { title: "What do you need done?", subtitle: "Describe the job in your own words — we'll match you with vetted local pros ASAP." },
  buddy: { title: "Not sure where to start?", subtitle: "Ask AI Buddy first — it's free, and it'll tell you if this is a DIY job or one for a pro." },
};

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
        <div className="inline-flex rounded-full border border-border bg-surface/80 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setMode("job")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === "job" ? "bg-brand-600 text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Post a job
          </button>
          <button
            type="button"
            onClick={() => setMode("buddy")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === "buddy" ? "bg-brand-600 text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Ask AI Buddy
          </button>
        </div>
      </div>

      <div className="relative mx-auto mt-6 max-w-2xl">
        {mode === "job" ? (
          <AiJobRequest categories={categories} prefillDescription={handoff ?? undefined} />
        ) : (
          <AiBuddy onHandoff={handleHandoff} />
        )}
      </div>

      {mode === "job" && (
        <p className="relative mt-4 text-center text-sm text-muted-foreground">
          Prefer to look yourself? <Link href="/search" className="font-medium text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-300 dark:hover:text-brand-200">Browse providers directly</Link>
        </p>
      )}
    </section>
  );
}
