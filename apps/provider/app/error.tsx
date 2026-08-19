"use client";

import { useEffect } from "react";
import { Button, Card } from "@asaplocal/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-sm space-y-3 p-6 text-center">
        <p className="text-lg font-semibold">Something went wrong</p>
        <p className="text-sm text-muted-foreground">
          This page hit an unexpected error. Reloading usually fixes it — this can happen if the app updated while you had it open.
        </p>
        <Button onClick={() => reset()} className="w-full">
          Try again
        </Button>
      </Card>
    </div>
  );
}
