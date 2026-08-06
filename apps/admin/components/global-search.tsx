"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function GlobalSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/users?q=${encodeURIComponent(q)}` : "/users");
  }

  return (
    <form onSubmit={onSubmit} className="relative w-full max-w-xl">
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search users, businesses…"
        aria-label="Search the admin environment"
        className="h-10 w-full rounded-full border border-border bg-muted/60 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-brand-400 focus:bg-surface"
      />
    </form>
  );
}
