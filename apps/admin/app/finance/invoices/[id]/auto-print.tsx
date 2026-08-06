"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function AutoPrint() {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("autoprint") === "1") {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [searchParams]);
  return null;
}
