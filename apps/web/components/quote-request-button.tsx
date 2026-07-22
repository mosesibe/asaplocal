"use client";
import Link from "next/link";
import { Button } from "@asaplocal/ui";

export function QuoteRequestButton({ businessId, businessName }: { businessId: string; businessName: string }) {
  return (
    <Link href={`/jobs/new?businessId=${businessId}&businessName=${encodeURIComponent(businessName)}`}>
      <Button size="lg">Request a quote</Button>
    </Link>
  );
}
