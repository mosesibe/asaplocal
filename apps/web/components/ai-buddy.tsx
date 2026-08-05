"use client";

import { useRef, useState } from "react";
import { ArrowUp, Loader2, Wrench } from "lucide-react";
import { Button } from "@asaplocal/ui";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  toolkit?: string[] | null;
  steps?: string[] | null;
  needsPro?: boolean;
}

const INTRO: DisplayMessage = {
  role: "assistant",
  content: "Hi, I'm AI Buddy 👋 Describe what's going wrong and I'll help you figure out if it's a quick DIY fix or you need a pro.",
};

export function AiBuddy({ onHandoff }: { onHandoff: (summary: string) => void }) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allMessages = [INTRO, ...messages];
  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const needsPro = !!latestAssistant?.needsPro;

  function scrollToBottom() {
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    const nextMessages: DisplayMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    scrollToBottom();
    try {
      const res = await fetch("/api/ai-buddy/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Something went wrong");
      setMessages([
        ...nextMessages,
        { role: "assistant", content: data.reply, toolkit: data.toolkit, steps: data.steps, needsPro: data.needsPro },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  function handleHandoff() {
    const summary = [
      "Customer used AI Buddy to troubleshoot this issue before requesting a pro.",
      ...messages.filter((m) => m.role === "user").map((m) => `- ${m.content}`),
    ].join("\n");
    onHandoff(summary);
  }

  return (
    <div className="overflow-hidden rounded-2xl">
      <p className="px-1 pb-3 text-sm text-espresso-200">Not sure if it's a DIY job? Describe it and I'll help you figure it out — free.</p>
      <div className="overflow-hidden rounded-2xl border border-espresso-100 bg-white">
        <div ref={listRef} className="max-h-96 space-y-3 overflow-y-auto p-4">
          {allMessages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className="max-w-[85%] space-y-2">
                <div
                  className={
                    m.role === "user"
                      ? "rounded-2xl rounded-tr-sm bg-brand-500 px-3.5 py-2.5 text-sm text-white"
                      : "rounded-2xl rounded-tl-sm bg-espresso-50 px-3.5 py-2.5 text-sm text-espresso-800"
                  }
                >
                  {m.content}
                </div>
                {(m.toolkit?.length || m.steps?.length) ? (
                  <div className="rounded-2xl border border-espresso-100 bg-white p-3.5 shadow-card">
                    {!!m.toolkit?.length && (
                      <>
                        <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-espresso-400">
                          <Wrench size={11} /> Toolkit
                        </p>
                        <ul className="mt-1.5 space-y-1 text-xs text-espresso-700">
                          {m.toolkit.map((t, j) => <li key={j}>• {t}</li>)}
                        </ul>
                      </>
                    )}
                    {!!m.steps?.length && (
                      <>
                        <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-espresso-400">Steps</p>
                        <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-espresso-700">
                          {m.steps.map((s, j) => <li key={j}>{s}</li>)}
                        </ol>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-espresso-50 px-3.5 py-2.5">
                <Loader2 size={16} className="animate-spin text-espresso-400" />
              </div>
            </div>
          )}
        </div>

        {needsPro && (
          <div className="border-t border-espresso-100 bg-brand-50 p-3.5 dark:bg-brand-950">
            <Button size="sm" className="w-full" onClick={handleHandoff}>
              This needs a pro — request one, I'll pass along what we discussed
            </Button>
          </div>
        )}

        <div className="border-t border-espresso-100 p-3">
          {error && <p className="mb-2 px-1 text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="e.g. My bathroom sink drains really slowly"
              className="flex-1 rounded-full border border-espresso-100 bg-espresso-50 px-4 py-2.5 text-sm text-espresso-900 placeholder:text-espresso-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Button size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={send} disabled={sending || !input.trim()} aria-label="Send">
              <ArrowUp size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
