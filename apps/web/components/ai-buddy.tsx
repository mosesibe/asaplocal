"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowUp, Check, Loader2, Mail, RotateCcw, Wrench } from "lucide-react";
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

// The conversation is worth keeping across a refresh or a trip to another
// page — advice with a toolkit and steps is the whole point of the feature.
// Stored locally (not server-side) because AI Buddy sits on the public
// homepage, so most people using it aren't signed in. Mirrors the
// `asaplocal:pendingJobPost` cache the job form already uses.
const STORAGE_KEY = "asaplocal:aiBuddyChat";
// The chat API rejects more than 20 messages, so only the tail is ever sent
// back — the full thread stays on screen regardless.
const MAX_SENT_MESSAGES = 20;

export function AiBuddy({ onHandoff }: { onHandoff: (summary: string) => void }) {
  const { data: session } = useSession();
  const defaultEmail = session?.user?.email ?? null;
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [restored, setRestored] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Restore after mount so the server and first client render agree.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      // Corrupt or unavailable storage should never break the chat.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return; // don't clobber saved history with the empty initial state
    try {
      if (messages.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private mode / quota — the chat still works for this session.
    }
  }, [messages, restored]);

  const allMessages = [INTRO, ...messages];
  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const needsPro = !!latestAssistant?.needsPro;

  function scrollToBottom() {
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
  }

  function startOver() {
    setMessages([]);
    setError(null);
    setInput("");
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
        body: JSON.stringify({
          messages: nextMessages.slice(-MAX_SENT_MESSAGES).map((m) => ({ role: m.role, content: m.content })),
        }),
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
      <div className="flex items-end justify-between gap-3 px-1 pb-3">
        <p className="text-sm text-muted-foreground">Not sure if it's a DIY job? Describe it and I'll help you figure it out — free.</p>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={startOver}
            className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            <RotateCcw size={12} /> Start over
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div ref={listRef} className="max-h-96 space-y-3 overflow-y-auto p-4">
          {allMessages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className="max-w-[85%] space-y-2">
                <div
                  className={
                    m.role === "user"
                      ? "rounded-2xl rounded-tr-sm bg-brand-500 px-3.5 py-2.5 text-sm text-white"
                      : "rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm text-foreground"
                  }
                >
                  {m.content}
                </div>
                {(m.toolkit?.length || m.steps?.length) ? (
                  <div className="rounded-2xl border border-border bg-surface p-3.5 shadow-card">
                    {!!m.toolkit?.length && (
                      <>
                        <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          <Wrench size={11} /> Toolkit
                        </p>
                        <ul className="mt-1.5 space-y-1 text-xs text-foreground">
                          {m.toolkit.map((t, j) => <li key={j}>• {t}</li>)}
                        </ul>
                      </>
                    )}
                    {!!m.steps?.length && (
                      <>
                        <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Steps</p>
                        <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-foreground">
                          {m.steps.map((s, j) => <li key={j}>{s}</li>)}
                        </ol>
                      </>
                    )}
                    <EmailGuide
                      summary={m.content}
                      toolkit={m.toolkit ?? []}
                      steps={m.steps ?? []}
                      defaultEmail={defaultEmail}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {needsPro && (
          <div className="border-t border-border bg-brand-50 p-3.5 dark:bg-brand-950">
            <Button size="sm" className="w-full" onClick={handleHandoff}>
              This needs a pro — request one, I'll pass along what we discussed
            </Button>
          </div>
        )}

        <div className="border-t border-border p-3">
          {error && <p className="mb-2 px-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
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
              className="flex-1 rounded-full border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
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

/**
 * Lets someone keep the useful part of a conversation — the toolkit and steps
 * — after they navigate away. For anonymous visitors this is the only way the
 * guide survives at all.
 */
function EmailGuide({
  summary,
  toolkit,
  steps,
  defaultEmail,
}: {
  summary: string;
  toolkit: string[];
  steps: string[];
  defaultEmail?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    const res = await fetch("/api/ai-buddy/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, summary, toolkit, steps }),
    }).catch(() => null);
    setSending(false);
    if (!res || !res.ok) {
      const body = await res?.json().catch(() => ({}));
      setError(body?.message ?? "Couldn't send that — please try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <Check size={13} /> Sent to {email} — check your inbox.
      </p>
    );
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {open ? (
        <div className="space-y-2">
          <label htmlFor="ai-guide-email" className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Email this guide
          </label>
          <div className="flex items-center gap-2">
            <input
              id="ai-guide-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && email.trim()) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Button size="sm" onClick={send} disabled={sending || !email.trim()} className="shrink-0">
              {sending ? <Loader2 size={13} className="animate-spin" /> : "Send"}
            </Button>
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
        >
          <Mail size={13} /> Email me this fix
        </button>
      )}
    </div>
  );
}
