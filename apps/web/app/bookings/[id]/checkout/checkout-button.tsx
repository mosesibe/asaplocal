"use client";
import { useState } from "react";
import { Button } from "@asaplocal/ui";

export function CheckoutButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false);
  async function pay() {
    setLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, paymentKind: "BOOKING_DEPOSIT" }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }
  return <Button size="lg" className="w-full" onClick={pay} disabled={loading}>{loading ? "Redirecting…" : "Pay deposit securely"}</Button>;
}
