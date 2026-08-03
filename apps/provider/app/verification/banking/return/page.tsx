import Link from "next/link";
import { Card } from "@asaplocal/ui";

export default function BankingReturnPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center sm:px-6">
      <Card className="p-6">
        <h1 className="text-xl font-bold">Banking setup submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Stripe is finishing setting up your account — this can take a moment. We'll update your status automatically once it's ready.
        </p>
        <Link href="/verification/banking" className="mt-4 inline-block font-medium text-brand-700 hover:underline">
          Back to banking
        </Link>
      </Card>
    </div>
  );
}
