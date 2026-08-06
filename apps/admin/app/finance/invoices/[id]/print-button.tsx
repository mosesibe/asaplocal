"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
    >
      <Printer size={15} /> Print / Download
    </button>
  );
}
