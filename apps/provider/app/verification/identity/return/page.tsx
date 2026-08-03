import Link from "next/link";
import { Card } from "@asaplocal/ui";

export default function IdentityVerificationReturnPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center sm:px-6">
      <Card className="p-6">
        <h1 className="text-xl font-bold">Verification submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Stripe is processing your verification — this usually takes a few minutes. We'll update your status automatically.
        </p>
        <Link href="/verification/identity" className="mt-4 inline-block font-medium text-brand-700 hover:underline">
          Back to identity verification
        </Link>
      </Card>
    </div>
  );
}
