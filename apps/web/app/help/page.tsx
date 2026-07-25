import Link from "next/link";
import { Card } from "@asaplocal/ui";

export const metadata = { title: "Help Center — LocalConnect" };

const TOPICS = [
  { q: "How do I post a job?", a: "Use \"Post a job\" and describe what you need — our AI assistant matches you with vetted local pros, or you can browse providers directly." },
  { q: "How do I pay for a booking?", a: "Once you accept a quote, you'll pay a deposit securely via Stripe to confirm the booking. The balance is settled with your provider on completion." },
  { q: "How do I cancel or reschedule?", a: "Open the booking from \"My account\" → Recent bookings, and use the options there. Cancellation policies vary by provider." },
  { q: "How do I contact my provider?", a: "Use Messages — every booking has a conversation thread with the provider." },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Help Center</h1>
      <p className="mt-2 text-muted-foreground">Common questions about using LocalConnect.</p>
      <div className="mt-6 space-y-3">
        {TOPICS.map((t) => (
          <Card key={t.q} className="p-4">
            <p className="font-medium">{t.q}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.a}</p>
          </Card>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Still need help? <Link href="/messages" className="text-brand-700 hover:underline">Message us</Link>.
      </p>
    </div>
  );
}
