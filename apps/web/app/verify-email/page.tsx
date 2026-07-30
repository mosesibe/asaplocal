import Link from "next/link";
import { consumeEmailVerificationToken } from "@asaplocal/core";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;
  const result = token && email ? await consumeEmailVerificationToken(email, token) : { ok: false as const, reason: "invalid" as const };

  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-bold">{result.ok ? "Email verified" : "Link no longer valid"}</h1>
      <p className="mt-3 text-muted-foreground">
        {result.ok
          ? "Your email address has been confirmed."
          : result.reason === "expired"
            ? "This verification link has expired. You can request a new one from your account page."
            : "This verification link is invalid or has already been used."}
      </p>
      <Link href="/dashboard" className="mt-6 inline-block font-medium text-brand-700 hover:underline">
        Go to your account →
      </Link>
    </div>
  );
}
