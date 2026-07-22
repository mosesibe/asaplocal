"use client";
import { useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";
import { Button, Input } from "@asaplocal/ui";

interface ChatMessage { id: string; body: string; senderId: string; createdAt: string }

export function ChatThread({ conversationId, currentUserId, initialMessages }: { conversationId: string; currentUserId: string; initialMessages: ChatMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
      authEndpoint: "/api/pusher/auth",
    });
    const channel = pusher.subscribe(`private-conversation-${conversationId}`);
    channel.bind("new-message", (msg: ChatMessage) => setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])));
    return () => {
      pusher.unsubscribe(`private-conversation-${conversationId}`);
      pusher.disconnect();
    };
  }, [conversationId]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  async function send() {
    if (!draft.trim()) return;
    const body = draft;
    setDraft("");
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, attachments: [] }),
    });
    if (res.ok) {
      const { message } = await res.json();
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    }
  }

  return (
    <div className="flex h-[70dvh] flex-col rounded-2xl border border-border">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.senderId === currentUserId ? "ml-auto bg-brand-600 text-white" : "bg-muted"}`}>
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex shrink-0 gap-2 border-t border-border p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…"
          className="flex-1"
        />
        <Button onClick={send}>Send</Button>
      </div>
    </div>
  );
}
