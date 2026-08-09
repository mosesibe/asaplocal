"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, Card } from "@asaplocal/ui";

export function CopyLink({ title, hint, link }: { title: string; hint: string; link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="p-5">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs">{link}</code>
        <Button size="sm" variant="outline" onClick={copy} aria-label={`Copy ${title.toLowerCase()} link`}>
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
        </Button>
      </div>
    </Card>
  );
}
