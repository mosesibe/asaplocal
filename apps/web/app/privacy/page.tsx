export const metadata = { title: "Privacy Policy — LocalConnect" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <div className="prose prose-sm mt-6 max-w-none text-muted-foreground">
        <p>
          We collect the information you provide when creating an account, posting a job, or booking a service —
          such as your name, email, phone number, and service addresses — to operate LocalConnect and connect you
          with providers.
        </p>
        <p>
          Payment details are handled directly by Stripe; we never store your card details. We share only the
          information necessary for a booking (e.g. your service address) with the provider you're working with.
        </p>
        <p>
          Full legal terms are being finalised. Contact support if you'd like a copy of the data we hold about you
          or want it deleted.
        </p>
      </div>
    </div>
  );
}
