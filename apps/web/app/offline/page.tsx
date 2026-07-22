"use client";

import { WifiOff } from "lucide-react";
import { Button, Card } from "@asaplocal/ui";

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-20 text-center sm:px-6">
      <Card className="p-8">
        <WifiOff className="mx-auto mb-4 text-muted-foreground" size={40} />
        <h1 className="text-xl font-bold">You're offline</h1>
        <p className="mt-2 text-muted-foreground">
          This page isn't available without a connection. Check your network and try again.
        </p>
        <Button className="mt-6 w-full" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </Card>
    </div>
  );
}
