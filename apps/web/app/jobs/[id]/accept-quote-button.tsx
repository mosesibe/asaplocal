"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@asaplocal/ui";

export function AcceptQuoteButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    const res = await fetch(`/api/quotes/${quoteId}/accept`, { method: "POST" });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/bookings/${data.bookingId}/checkout`);
    }
  }

  return <Button onClick={accept} disabled={loading}>{loading ? "Booking…" : "Accept & book"}</Button>;
}
