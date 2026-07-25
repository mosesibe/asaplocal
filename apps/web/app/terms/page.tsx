export const metadata = { title: "Terms of Service — LocalConnect" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <div className="prose prose-sm mt-6 max-w-none text-muted-foreground">
        <p>
          These Terms of Service govern your use of LocalConnect. By creating an account or booking a service through
          the platform, you agree to these terms.
        </p>
        <p>
          LocalConnect connects customers with independent local service providers. We are not a party to the
          service agreement between you and a provider — providers are responsible for the quality, safety, and
          completion of the work they perform.
        </p>
        <p>
          Full legal terms are being finalised. Contact support if you have questions about a specific booking or
          policy in the meantime.
        </p>
      </div>
    </div>
  );
}
