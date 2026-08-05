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
    <section className="relative overflow-hidden bg-espresso-950 px-4 py-14 sm:px-6 sm:py-20">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-900/40 via-transparent to-transparent"
        aria-hidden
      />
      <div className="relative mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-brand-50 sm:text-4xl">{COPY[mode].title}</h1>
        <p className="mt-3 text-lg text-espresso-200">{COPY[mode].subtitle}</p>
      </div>

      <div className="relative mx-auto mt-6 flex max-w-2xl justify-center">
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setMode("job")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === "job" ? "bg-white text-espresso-900" : "text-espresso-200 hover:text-white"
            }`}
          >
            Post a job
          </button>
          <button
            type="button"
            onClick={() => setMode("buddy")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === "buddy" ? "bg-white text-espresso-900" : "text-espresso-200 hover:text-white"
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
        <p className="relative mt-4 text-center text-sm text-espresso-200">
          Prefer to look yourself? <Link href="/search" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">Browse providers directly</Link>
        </p>
      )}
    </section>
  );
}
